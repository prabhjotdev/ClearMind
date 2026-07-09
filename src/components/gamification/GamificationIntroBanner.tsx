import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import './GamificationIntroBanner.css';

export default function GamificationIntroBanner() {
  const { settings, updateSetting } = useSettings();

  if (settings.gamificationEnabled || settings.gamificationBannerDismissed) return null;

  return (
    <div className="gamification-intro-banner" role="note">
      <span className="gamification-intro-banner-emoji" aria-hidden="true">
        ⚡
      </span>
      <p className="gamification-intro-banner-text">
        New: grow a companion and collect Pokemon as you complete tasks. Purely optional, nothing
        to lose on a quiet day.
      </p>
      <div className="gamification-intro-banner-actions">
        <button
          className="gamification-intro-banner-try-btn"
          onClick={() => updateSetting('gamificationEnabled', true)}
        >
          Try it
        </button>
        <button
          className="gamification-intro-banner-dismiss-btn"
          onClick={() => updateSetting('gamificationBannerDismissed', true)}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
