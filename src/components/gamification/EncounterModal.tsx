import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { EncounterResult, catchSpecies } from '../../services/gamificationService';
import './EncounterModal.css';

interface EncounterModalProps {
  encounters: EncounterResult[];
  routeId: string;
  onClose: () => void;
}

// Brief flourish rather than the original Pokewalker's real-time wait — the
// user chose instant/near-instant resolution to keep this low-friction.
const WALK_ANIMATION_MS = 1200;

export default function EncounterModal({ encounters, routeId, onClose }: EncounterModalProps) {
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const [phase, setPhase] = useState<'walking' | 'reveal'>(
    settings.reducedMotion ? 'reveal' : 'walking'
  );
  const [caughtIds, setCaughtIds] = useState<Set<string>>(new Set());
  const userId = currentUser?.uid;

  useEffect(() => {
    if (phase !== 'walking') return;
    const timer = setTimeout(() => setPhase('reveal'), WALK_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  async function handleCatch(speciesId: string) {
    if (!userId || caughtIds.has(speciesId)) return;
    setCaughtIds((prev) => new Set(prev).add(speciesId));
    await catchSpecies(userId, speciesId, routeId);
  }

  const allCaught = encounters.every((e) => caughtIds.has(e.species.id));

  return (
    <div className="encounter-modal-overlay" role="dialog" aria-modal="true" aria-label="Wild Pokemon encounter">
      <div className="encounter-modal">
        {phase === 'walking' ? (
          <div className="encounter-modal-walking">
            <span className="encounter-modal-walking-emoji" aria-hidden="true">
              🚶
            </span>
            <p>Walking the route…</p>
          </div>
        ) : (
          <>
            <h2 className="encounter-modal-title">
              {encounters.length === 0 ? 'No Pokemon appeared this time' : 'A wild Pokemon appeared!'}
            </h2>
            <div className="encounter-modal-list">
              {encounters.map((encounter) => (
                <div key={encounter.species.id} className="encounter-modal-item">
                  <span className="encounter-modal-emoji" aria-hidden="true">
                    {encounter.species.emoji}
                  </span>
                  <span className="encounter-modal-name">{encounter.species.name}</span>
                  <button
                    className="encounter-modal-catch-btn"
                    onClick={() => handleCatch(encounter.species.id)}
                    disabled={caughtIds.has(encounter.species.id)}
                  >
                    {caughtIds.has(encounter.species.id) ? 'Caught!' : 'Catch'}
                  </button>
                </div>
              ))}
            </div>
            <button
              className="encounter-modal-done-btn"
              onClick={onClose}
              disabled={encounters.length > 0 && !allCaught}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
