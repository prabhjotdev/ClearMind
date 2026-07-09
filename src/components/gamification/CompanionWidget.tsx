import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGamification } from '../../contexts/GamificationContext';
import { getCompanionStageForLevel } from '../../data/gamificationContent';
import { xpProgress } from '../../constants/gamificationConfig';
import RouteSelectView from './RouteSelectView';
import './CompanionWidget.css';

export default function CompanionWidget() {
  const { state } = useGamification();
  const navigate = useNavigate();
  const [showRouteSelect, setShowRouteSelect] = useState(false);

  const stage = getCompanionStageForLevel(state.companionLevel);
  const progress = xpProgress(state.companionXp);
  const progressPct =
    progress.xpForNextLevel === 0
      ? 0
      : Math.min(100, Math.round((progress.xpIntoLevel / progress.xpForNextLevel) * 100));

  return (
    <div className="companion-widget">
      <button
        className="companion-widget-info"
        onClick={() => navigate('/pokedex')}
        aria-label={`${stage.name}, level ${state.companionLevel}. View Pokedex`}
      >
        <span className="companion-widget-emoji" aria-hidden="true">
          {stage.emoji}
        </span>
        <span className="companion-widget-details">
          <span className="companion-widget-name">
            {stage.name} · Lv {state.companionLevel}
          </span>
          <span className="companion-widget-xp-bar">
            <span
              className="companion-widget-xp-fill"
              style={{ width: `${progressPct}%` }}
            />
          </span>
        </span>
      </button>
      <button
        className="companion-widget-explore-btn"
        onClick={() => setShowRouteSelect(true)}
      >
        Explore
      </button>
      <RouteSelectView isOpen={showRouteSelect} onClose={() => setShowRouteSelect(false)} />
    </div>
  );
}
