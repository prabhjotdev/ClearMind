// Gamification content interface — kept separate from gamificationConfig.ts
// (tuning numbers) and from the per-user Firestore state (gamificationService.ts).
// This is static game content, bundled with the app, not stored in Firestore.

import { USE_ORIGINAL_CONTENT } from '../constants/gamificationConfig';
import { POKEMON_CONTENT } from './content/pokemonContent';
import { ORIGINAL_CONTENT } from './content/originalContent';

export type PokemonType = 'grass' | 'fire' | 'water' | 'normal';

export interface RouteDef {
  id: string;
  name: string;
  pokemonType: PokemonType;
  // Case-insensitive substring match against Category.name to auto-assign a route.
  matchesCategoryNames: string[];
  isFallback?: boolean;
  colorTheme: string;
  emoji: string;
}

export interface SpeciesDef {
  id: string;
  name: string;
  routeIds: string[];
  rarity: 'common' | 'uncommon' | 'rare';
  emoji: string;
}

export interface CompanionStageDef {
  minLevel: number;
  speciesId: string;
  name: string;
  emoji: string;
}

export interface GamificationContentPack {
  routes: RouteDef[];
  species: SpeciesDef[];
  companionStages: CompanionStageDef[];
}

// Single swap point: flip USE_ORIGINAL_CONTENT in gamificationConfig.ts to
// switch every route/species/companion name in the app with no other code changes.
const ACTIVE_CONTENT: GamificationContentPack = USE_ORIGINAL_CONTENT
  ? ORIGINAL_CONTENT
  : POKEMON_CONTENT;

export const ROUTES: RouteDef[] = ACTIVE_CONTENT.routes;
export const SPECIES: SpeciesDef[] = ACTIVE_CONTENT.species;
export const COMPANION_STAGES: CompanionStageDef[] = ACTIVE_CONTENT.companionStages;

export function getFallbackRoute(): RouteDef {
  return ROUTES.find((r) => r.isFallback) || ROUTES[0];
}

export function getRouteForCategoryName(categoryName: string | undefined): RouteDef {
  if (!categoryName) return getFallbackRoute();
  const lower = categoryName.toLowerCase();
  const match = ROUTES.find(
    (r) => !r.isFallback && r.matchesCategoryNames.some((name) => lower.includes(name.toLowerCase()))
  );
  return match || getFallbackRoute();
}

export function getSpeciesById(speciesId: string): SpeciesDef | undefined {
  return SPECIES.find((s) => s.id === speciesId);
}

export function getSpeciesForRoute(routeId: string): SpeciesDef[] {
  return SPECIES.filter((s) => s.routeIds.includes(routeId));
}

export function getCompanionStageForLevel(level: number): CompanionStageDef {
  const eligible = COMPANION_STAGES.filter((s) => s.minLevel <= level);
  return eligible[eligible.length - 1] || COMPANION_STAGES[0];
}
