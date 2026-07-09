import React from 'react';
import { useGamification } from '../../contexts/GamificationContext';
import { SPECIES } from '../../data/gamificationContent';
import './PokedexView.css';

export default function PokedexView() {
  const { pokedex } = useGamification();
  const caughtIds = new Set(pokedex.map((e) => e.speciesId));
  const completionPct =
    SPECIES.length === 0 ? 0 : Math.round((caughtIds.size / SPECIES.length) * 100);

  return (
    <div className="pokedex-view">
      <h2 className="pokedex-title">Pokedex</h2>
      <p className="pokedex-completion">
        {caughtIds.size} / {SPECIES.length} caught ({completionPct}%)
      </p>
      <div className="pokedex-grid">
        {SPECIES.map((species) => {
          const caught = caughtIds.has(species.id);
          return (
            <div
              key={species.id}
              className={`pokedex-card ${caught ? 'pokedex-card--caught' : 'pokedex-card--silhouette'}`}
            >
              <span className="pokedex-card-emoji" aria-hidden="true">
                {caught ? species.emoji : '❔'}
              </span>
              <span className="pokedex-card-name">{caught ? species.name : '???'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
