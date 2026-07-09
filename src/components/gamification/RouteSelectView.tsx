import React, { useState } from 'react';
import BottomSheet from '../common/BottomSheet';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import { ROUTES } from '../../data/gamificationContent';
import { ROUTE_VISIT_COST } from '../../constants/gamificationConfig';
import { visitRoute, EncounterResult } from '../../services/gamificationService';
import EncounterModal from './EncounterModal';
import './RouteSelectView.css';

interface RouteSelectViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RouteSelectView({ isOpen, onClose }: RouteSelectViewProps) {
  const { currentUser } = useAuth();
  const { state } = useGamification();
  const [isVisiting, setIsVisiting] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<EncounterResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = currentUser?.uid;
  const canAfford = state.focusPoints >= ROUTE_VISIT_COST;

  async function handleVisit(routeId: string) {
    if (!userId || !canAfford || isVisiting) return;
    setError(null);
    setIsVisiting(true);
    try {
      const results = await visitRoute(userId, routeId);
      setActiveRouteId(routeId);
      setEncounters(results);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setIsVisiting(false);
    }
  }

  function handleEncounterClose() {
    setEncounters(null);
    setActiveRouteId(null);
    onClose();
  }

  if (encounters && activeRouteId) {
    return (
      <EncounterModal encounters={encounters} routeId={activeRouteId} onClose={handleEncounterClose} />
    );
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} ariaLabel="Choose a route to explore">
      <div className="route-select">
        <h2 className="route-select-title">Explore a route</h2>
        <p className="route-select-balance">
          <span aria-hidden="true">✨</span> {state.focusPoints} Focus Points
        </p>
        <div className="route-select-list">
          {ROUTES.map((route) => (
            <button
              key={route.id}
              className="route-select-item"
              style={{ borderColor: route.colorTheme }}
              onClick={() => handleVisit(route.id)}
              disabled={!canAfford || isVisiting}
            >
              <span className="route-select-emoji" aria-hidden="true">
                {route.emoji}
              </span>
              <span className="route-select-name">{route.name}</span>
              <span className="route-select-cost">{ROUTE_VISIT_COST} pts</span>
            </button>
          ))}
        </div>
        {!canAfford && (
          <p className="route-select-hint">Complete more tasks to earn Focus Points.</p>
        )}
        {error && (
          <p className="route-select-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
