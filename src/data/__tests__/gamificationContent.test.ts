import {
  ROUTES,
  SPECIES,
  COMPANION_STAGES,
  getRouteForCategoryName,
  getFallbackRoute,
  getSpeciesForRoute,
  getCompanionStageForLevel,
} from '../gamificationContent';

describe('content pack integrity', () => {
  it('has exactly one fallback route', () => {
    const fallbacks = ROUTES.filter((r) => r.isFallback);
    expect(fallbacks.length).toBe(1);
  });

  it('every species belongs to at least one real route', () => {
    const routeIds = new Set(ROUTES.map((r) => r.id));
    SPECIES.forEach((s) => {
      expect(s.routeIds.length).toBeGreaterThan(0);
      s.routeIds.forEach((id) => expect(routeIds.has(id)).toBe(true));
    });
  });

  it('every route has at least one catchable species', () => {
    ROUTES.forEach((route) => {
      expect(getSpeciesForRoute(route.id).length).toBeGreaterThan(0);
    });
  });

  it('companion stages are sorted by ascending minLevel starting at 1', () => {
    expect(COMPANION_STAGES[0].minLevel).toBe(1);
    for (let i = 1; i < COMPANION_STAGES.length; i++) {
      expect(COMPANION_STAGES[i].minLevel).toBeGreaterThan(COMPANION_STAGES[i - 1].minLevel);
    }
  });
});

describe('getRouteForCategoryName', () => {
  it('matches a category name to its route case-insensitively', () => {
    expect(getRouteForCategoryName('Health').pokemonType).toBe('grass');
    expect(getRouteForCategoryName('work')).toBeTruthy();
    expect(getRouteForCategoryName('WORK').pokemonType).toBe('fire');
  });

  it('falls back for unmatched or missing category names', () => {
    expect(getRouteForCategoryName('Miscellaneous Errands').isFallback).toBeFalsy();
    // "errand" matches Personal's route via substring match
    expect(getRouteForCategoryName(undefined)).toEqual(getFallbackRoute());
    expect(getRouteForCategoryName('Something Totally Unrelated')).toEqual(getFallbackRoute());
  });
});

describe('getCompanionStageForLevel', () => {
  it('returns the first stage below level 1', () => {
    expect(getCompanionStageForLevel(1)).toEqual(COMPANION_STAGES[0]);
  });

  it('advances to later stages at their minLevel', () => {
    const secondStage = COMPANION_STAGES[1];
    expect(getCompanionStageForLevel(secondStage.minLevel)).toEqual(secondStage);
    expect(getCompanionStageForLevel(secondStage.minLevel - 1)).toEqual(COMPANION_STAGES[0]);
  });
});
