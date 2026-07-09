import { Priority } from '../types';

// Single switch to swap all Pokemon names/species/routes for the original,
// invented content pack in src/data/content/originalContent.ts. No other code
// change is needed — see src/data/gamificationContent.ts.
export const USE_ORIGINAL_CONTENT = false;

// XP/points are a pure function of task priority and nothing else: no dates,
// no streaks, no "days since last completion." Nothing here can go backwards
// due to inactivity — see docs/01-PRD.md non-goals for why that matters.
export const XP_BY_PRIORITY: Record<Priority, number> = {
  P1: 15,
  P2: 10,
  P3: 5,
};

export const FOCUS_POINTS_BY_PRIORITY: Record<Priority, number> = {
  P1: 3,
  P2: 2,
  P3: 1,
};

// XP required to advance from `level` to `level + 1`.
export function xpToNextLevel(level: number): number {
  return 50 * level;
}

export interface XpProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

// companionXp is stored as a lifetime cumulative total; this derives the
// current level and how far into that level the companion is, for progress
// bars. Never resets/decreases — it's a pure function of the stored total.
export function xpProgress(totalXp: number): XpProgress {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: xpToNextLevel(level) };
}

export function levelForXp(xp: number): number {
  return xpProgress(xp).level;
}

// MVP: a single fixed spend amount per route visit, one encounter, mostly
// common with a small chance of uncommon/rare. Multiple tiers are deferred.
export const ROUTE_VISIT_COST = 10;
export const ENCOUNTERS_PER_VISIT = 1;
export const CATCH_RARITY_ODDS: { common: number; uncommon: number; rare: number } = {
  common: 0.7,
  uncommon: 0.25,
  rare: 0.05,
};
