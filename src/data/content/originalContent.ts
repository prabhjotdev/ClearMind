import { GamificationContentPack } from '../gamificationContent';

// Original, invented creature names — the fallback pack activated by setting
// USE_ORIGINAL_CONTENT = true in gamificationConfig.ts. Route ids/types/colors
// are kept identical to pokemonContent.ts so flipping the flag doesn't change
// which route a task category maps to, only the creature names shown.
export const ORIGINAL_CONTENT: GamificationContentPack = {
  routes: [
    {
      id: 'verdant-trail',
      name: 'Verdant Trail',
      pokemonType: 'grass',
      matchesCategoryNames: ['health', 'wellness', 'fitness'],
      colorTheme: '#10B981',
      emoji: '🌿',
    },
    {
      id: 'ember-path',
      name: 'Ember Path',
      pokemonType: 'fire',
      matchesCategoryNames: ['work', 'career', 'project'],
      colorTheme: '#F97316',
      emoji: '🔥',
    },
    {
      id: 'rippling-shore',
      name: 'Rippling Shore',
      pokemonType: 'water',
      matchesCategoryNames: ['personal', 'home', 'chores', 'errand'],
      colorTheme: '#3B82F6',
      emoji: '🌊',
    },
    {
      id: 'route-1',
      name: 'Route 1',
      pokemonType: 'normal',
      matchesCategoryNames: [],
      isFallback: true,
      colorTheme: '#9CA3AF',
      emoji: '🍃',
    },
  ],
  species: [
    { id: 'sproutling', name: 'Sproutling', routeIds: ['verdant-trail'], rarity: 'common', emoji: '🌱' },
    { id: 'budrock', name: 'Budrock', routeIds: ['verdant-trail'], rarity: 'uncommon', emoji: '🌿' },
    { id: 'grovemaw', name: 'Grovemaw', routeIds: ['verdant-trail'], rarity: 'rare', emoji: '🌳' },
    { id: 'emberkit', name: 'Emberkit', routeIds: ['ember-path'], rarity: 'common', emoji: '🦎' },
    { id: 'flarewing', name: 'Flarewing', routeIds: ['ember-path'], rarity: 'uncommon', emoji: '🔥' },
    { id: 'pyrodrake', name: 'Pyrodrake', routeIds: ['ember-path'], rarity: 'rare', emoji: '🐉' },
    { id: 'ripplet', name: 'Ripplet', routeIds: ['rippling-shore'], rarity: 'common', emoji: '🐢' },
    { id: 'tidewell', name: 'Tidewell', routeIds: ['rippling-shore'], rarity: 'uncommon', emoji: '🐢' },
    { id: 'duckle', name: 'Duckle', routeIds: ['rippling-shore'], rarity: 'common', emoji: '🦆' },
    { id: 'flitmouse', name: 'Flitmouse', routeIds: ['route-1'], rarity: 'common', emoji: '🐦' },
    { id: 'wingpip', name: 'Wingpip', routeIds: ['route-1'], rarity: 'uncommon', emoji: '🐦' },
    { id: 'scurry', name: 'Scurry', routeIds: ['route-1'], rarity: 'common', emoji: '🐀' },
  ],
  companionStages: [
    { minLevel: 1, speciesId: 'sparkit', name: 'Sparkit', emoji: '⚡' },
    { minLevel: 5, speciesId: 'voltling', name: 'Voltling', emoji: '⚡' },
    { minLevel: 15, speciesId: 'thundrake', name: 'Thundrake', emoji: '⚡' },
  ],
};
