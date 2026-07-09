# ClearMind — Gamification (Companion & Pokedex)

## Why this exists despite the PRD non-goal

`docs/01-PRD.md` excludes streak/loss-based gamification because it can trigger shame spirals for
ADHD users when a streak breaks or a score decays. This feature is a deliberate exception, designed
specifically to avoid that failure mode: every number in the system is monotonic. Nothing decreases
because of inactivity — only because the user chooses to spend it. It ships **off by default**, opt-in
via Settings, with a small dismissible intro banner.

## The loop

Inspired by the Pokewalker (a Pokemon HeartGold/SoulSilver pedometer accessory): you earn a currency
passively, then spend it to go find creatures to catch.

1. **Passive — Companion XP.** Every completed task feeds XP to one persistent companion shown on the
   dashboard (`CompanionWidget`). It levels and evolves at milestones. XP never decreases.
2. **Active — Focus Points → Routes → Catching.** Completing tasks also earns spendable Focus Points.
   Task categories map to themed Routes (`RouteSelectView`), each tied to a Pokemon type. Spending
   `ROUTE_VISIT_COST` points on a route triggers a short (~1.2s, skipped under reduced-motion) reveal
   of 1 wild Pokemon encounter (`EncounterModal`), then an always-succeeds tap-to-catch. Catches
   populate the Pokedex (`PokedexView`, route `/pokedex`), grouped implicitly by rarity/species, with
   a completion percentage that only ever goes up. Unspent points never expire.

Earning is a pure function of `(task priority, first-completion)` — no dates, gaps, or streaks
anywhere in `gamificationConfig.ts` or `gamificationService.ts`.

## Content and the IP tradeoff

This ships with **real Pokemon names/species** by default (`src/data/content/pokemonContent.ts`).
Citing a data source does not grant a trademark/copyright license, and this is a public repo, so
there is real IP exposure in shipping this as-is — that tradeoff was made knowingly.

If this ever needs to change, flip `USE_ORIGINAL_CONTENT` in `src/constants/gamificationConfig.ts` to
`true`. This swaps every route/species/companion name for the invented content pack in
`src/data/content/originalContent.ts` with no other code changes — see `src/data/gamificationContent.ts`
for the swap point. The original pack is a functional stub (MVP-scoped, same route ids/counts); it
would need its own art/copy pass if actually shipped.

## Key files

| Concern | File |
|---|---|
| Content interface + active-pack selection | `src/data/gamificationContent.ts` |
| Real Pokemon content (default) | `src/data/content/pokemonContent.ts` |
| Original fallback content | `src/data/content/originalContent.ts` |
| Tuning constants, content-pack flag | `src/constants/gamificationConfig.ts` |
| Firestore reads/writes, encounter/catch logic | `src/services/gamificationService.ts` |
| Live-synced state for components | `src/contexts/GamificationContext.tsx` |
| Task-completion integration point | `src/hooks/useTaskCompletion.ts` |
| UI | `src/components/gamification/*`, `src/components/views/PokedexView.tsx` |
| Settings toggle | `src/components/views/SettingsView.tsx` ("Companion & Collecting" section) |

## Explicitly deferred (not in this pass)

Multiple route-spend tiers with scaling rarity/encounter count, richer companion evolution art,
per-route Pokedex grouping, encounter animation polish, user-customizable category→route mapping,
companion cosmetics/nicknames, a stats/insights view, and building out `originalContent.ts` beyond an
MVP-equivalent stub.
