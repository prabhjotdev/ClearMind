import { GamificationContentPack } from '../gamificationContent';

// Real Pokemon species/names — see docs/01-PRD.md gamification section and
// gamificationConfig.ts USE_ORIGINAL_CONTENT for the IP-risk tradeoff behind
// this choice, and originalContent.ts for the swappable fallback.
export const POKEMON_CONTENT: GamificationContentPack = {
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
    // Verdant Trail (grass)
    { id: 'bulbasaur', name: 'Bulbasaur', routeIds: ['verdant-trail'], rarity: 'common', emoji: '🌱' },
    { id: 'ivysaur', name: 'Ivysaur', routeIds: ['verdant-trail'], rarity: 'uncommon', emoji: '🌿' },
    { id: 'venusaur', name: 'Venusaur', routeIds: ['verdant-trail'], rarity: 'rare', emoji: '🌳' },
    { id: 'chikorita', name: 'Chikorita', routeIds: ['verdant-trail'], rarity: 'common', emoji: '🍃' },
    // Ember Path (fire)
    { id: 'charmander', name: 'Charmander', routeIds: ['ember-path'], rarity: 'common', emoji: '🦎' },
    { id: 'charmeleon', name: 'Charmeleon', routeIds: ['ember-path'], rarity: 'uncommon', emoji: '🔥' },
    { id: 'charizard', name: 'Charizard', routeIds: ['ember-path'], rarity: 'rare', emoji: '🐉' },
    { id: 'vulpix', name: 'Vulpix', routeIds: ['ember-path'], rarity: 'common', emoji: '🦊' },
    // Rippling Shore (water)
    { id: 'squirtle', name: 'Squirtle', routeIds: ['rippling-shore'], rarity: 'common', emoji: '🐢' },
    { id: 'wartortle', name: 'Wartortle', routeIds: ['rippling-shore'], rarity: 'uncommon', emoji: '🐢' },
    { id: 'psyduck', name: 'Psyduck', routeIds: ['rippling-shore'], rarity: 'common', emoji: '🦆' },
    // Route 1 (normal, fallback)
    { id: 'pidgey', name: 'Pidgey', routeIds: ['route-1'], rarity: 'common', emoji: '🐦' },
    { id: 'pidgeotto', name: 'Pidgeotto', routeIds: ['route-1'], rarity: 'uncommon', emoji: '🐦' },
    { id: 'rattata', name: 'Rattata', routeIds: ['route-1'], rarity: 'common', emoji: '🐀' },
  ],
  companionStages: [
    { minLevel: 1, speciesId: 'pichu', name: 'Pichu', emoji: '⚡' },
    { minLevel: 5, speciesId: 'pikachu', name: 'Pikachu', emoji: '⚡' },
    { minLevel: 15, speciesId: 'raichu', name: 'Raichu', emoji: '⚡' },
  ],
};
