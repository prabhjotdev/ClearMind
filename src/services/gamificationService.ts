import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { GamificationState, PokedexEntry, DEFAULT_GAMIFICATION_STATE, Task } from '../types';
import {
  XP_BY_PRIORITY,
  FOCUS_POINTS_BY_PRIORITY,
  levelForXp,
  ROUTE_VISIT_COST,
  ENCOUNTERS_PER_VISIT,
  CATCH_RARITY_ODDS,
} from '../constants/gamificationConfig';
import { getCompanionStageForLevel, getSpeciesForRoute, SpeciesDef } from '../data/gamificationContent';

function gamificationDoc(userId: string) {
  return doc(db, 'users', userId, 'gamification', 'state');
}

function pokedexCollection(userId: string) {
  return collection(db, 'users', userId, 'pokedex');
}

function pokedexDoc(userId: string, speciesId: string) {
  return doc(db, 'users', userId, 'pokedex', speciesId);
}

export async function initializeGamificationState(userId: string): Promise<GamificationState> {
  const ref = gamificationDoc(userId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as GamificationState;

  const now = Timestamp.now();
  const state: GamificationState = {
    ...DEFAULT_GAMIFICATION_STATE,
    companionSpeciesId: getCompanionStageForLevel(1).speciesId,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, state);
  return state;
}

export function subscribeToGamificationState(
  userId: string,
  callback: (state: GamificationState) => void
): () => void {
  return onSnapshot(gamificationDoc(userId), (snap) => {
    if (snap.exists()) callback(snap.data() as GamificationState);
  });
}

export function subscribeToPokedex(
  userId: string,
  callback: (entries: PokedexEntry[]) => void
): () => void {
  return onSnapshot(pokedexCollection(userId), (snap) => {
    callback(snap.docs.map((d) => d.data() as PokedexEntry));
  });
}

export interface AwardResult {
  xpGained: number;
  pointsGained: number;
  leveledUp: boolean;
  newLevel: number;
  newSpeciesId: string;
}

// Pure function of (priority) — no dates, no streaks, nothing that can be
// affected by a gap in activity. See docs/01-PRD.md non-goals.
export async function awardForTaskCompletion(userId: string, task: Task): Promise<AwardResult> {
  const xpGained = XP_BY_PRIORITY[task.priority];
  const pointsGained = FOCUS_POINTS_BY_PRIORITY[task.priority];

  const ref = gamificationDoc(userId);
  const snap = await getDoc(ref);
  const beforeState = snap.exists() ? (snap.data() as GamificationState) : null;
  const beforeLevel = beforeState?.companionLevel ?? 1;
  const beforeXp = beforeState?.companionXp ?? 0;

  const newXp = beforeXp + xpGained;
  const newLevel = levelForXp(newXp);
  const newSpeciesId = getCompanionStageForLevel(newLevel).speciesId;

  await updateDoc(ref, {
    companionXp: increment(xpGained),
    companionLevel: newLevel,
    companionSpeciesId: newSpeciesId,
    focusPoints: increment(pointsGained),
    lifetimeFocusPointsEarned: increment(pointsGained),
    updatedAt: Timestamp.now(),
  });

  return {
    xpGained,
    pointsGained,
    leveledUp: newLevel > beforeLevel,
    newLevel,
    newSpeciesId,
  };
}

// Only ever called from the same undo-toast closure created at completion
// time (see useTaskCompletion) — a later, out-of-band "uncomplete" does NOT
// call this, by design (treated as a UI correction, not a punishment).
export async function reverseAwardForTaskCompletion(userId: string, task: Task): Promise<void> {
  const xpLost = XP_BY_PRIORITY[task.priority];
  const pointsLost = FOCUS_POINTS_BY_PRIORITY[task.priority];

  const ref = gamificationDoc(userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const state = snap.data() as GamificationState;

  const newXp = Math.max(0, state.companionXp - xpLost);
  const newLevel = levelForXp(newXp);
  const newSpeciesId = getCompanionStageForLevel(newLevel).speciesId;

  await updateDoc(ref, {
    companionXp: newXp,
    companionLevel: newLevel,
    companionSpeciesId: newSpeciesId,
    // lifetimeFocusPointsEarned is intentionally left untouched — it's a
    // lifetime stat, only the spendable balance is corrected on undo.
    focusPoints: increment(-Math.min(pointsLost, state.focusPoints)),
    updatedAt: Timestamp.now(),
  });
}

export interface EncounterResult {
  species: SpeciesDef;
}

function rollEncounter(pool: SpeciesDef[]): SpeciesDef | null {
  if (pool.length === 0) return null;
  const roll = Math.random();
  let rarity: SpeciesDef['rarity'] = 'common';
  if (roll < CATCH_RARITY_ODDS.rare) rarity = 'rare';
  else if (roll < CATCH_RARITY_ODDS.rare + CATCH_RARITY_ODDS.uncommon) rarity = 'uncommon';

  const matching = pool.filter((s) => s.rarity === rarity);
  const candidates = matching.length > 0 ? matching : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Spends ROUTE_VISIT_COST Focus Points and rolls encounters. Throws if the
// user doesn't have enough points — callers should check balance in the UI
// before offering the action, this is the source-of-truth guard.
export async function visitRoute(userId: string, routeId: string): Promise<EncounterResult[]> {
  const ref = gamificationDoc(userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Gamification state not initialized');
  const state = snap.data() as GamificationState;
  if (state.focusPoints < ROUTE_VISIT_COST) {
    throw new Error('Not enough Focus Points');
  }

  await updateDoc(ref, {
    focusPoints: increment(-ROUTE_VISIT_COST),
    updatedAt: Timestamp.now(),
  });

  const pool = getSpeciesForRoute(routeId);
  const encounters: EncounterResult[] = [];
  for (let i = 0; i < ENCOUNTERS_PER_VISIT; i++) {
    const species = rollEncounter(pool);
    if (species) encounters.push({ species });
  }
  return encounters;
}

// Always succeeds — no fail state, by design.
export async function catchSpecies(userId: string, speciesId: string, routeId: string): Promise<void> {
  const ref = pokedexDoc(userId, speciesId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      tx.update(ref, { caughtCount: increment(1) });
    } else {
      const entry: PokedexEntry = {
        speciesId,
        firstCaughtAt: Timestamp.now(),
        caughtCount: 1,
        routeId,
      };
      tx.set(ref, entry);
    }
  });
}
