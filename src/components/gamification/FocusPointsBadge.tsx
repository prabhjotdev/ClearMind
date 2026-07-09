import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useGamification } from '../../contexts/GamificationContext';
import './FocusPointsBadge.css';

export default function FocusPointsBadge() {
  const { settings } = useSettings();
  const { state } = useGamification();

  if (!settings.gamificationEnabled) return null;

  return (
    <div className="focus-points-badge" title="Focus Points" aria-label={`${state.focusPoints} Focus Points`}>
      <span aria-hidden="true">✨</span>
      <span>{state.focusPoints}</span>
    </div>
  );
}
