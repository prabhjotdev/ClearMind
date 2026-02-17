import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { subscribeToSettings, updateSettings, initializeSettings } from '../../services/settingsService';
import { UserSettings, DEFAULT_SETTINGS } from '../../types';
import './SettingsView.css';

export default function SettingsView() {
  const { currentUser, signOut } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const userId = currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    initializeSettings(userId);
    return subscribeToSettings(userId, setSettings);
  }, [userId]);

  async function handleSettingChange(key: keyof UserSettings, value: unknown) {
    if (!userId) return;
    await updateSettings(userId, { [key]: value });
  }

  function toggleSection(section: string) {
    setExpandedSection((prev) => (prev === section ? null : section));
  }

  return (
    <div className="settings-view">
      <h2 className="settings-title">Settings</h2>

      {/* Account */}
      <section className="settings-section">
        <h3 className="settings-section-title">Account</h3>
        <div className="settings-card">
          <div className="settings-account">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt=""
                className="settings-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="settings-avatar settings-avatar--placeholder">
                {(currentUser?.displayName || currentUser?.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="settings-account-name">
                {currentUser?.displayName || 'User'}
              </div>
              <div className="settings-account-email">
                {currentUser?.email}
              </div>
            </div>
          </div>
          <button className="settings-signout" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="settings-section">
        <button
          className="settings-section-title settings-section-toggle"
          onClick={() => toggleSection('notifications')}
          aria-expanded={expandedSection === 'notifications'}
        >
          Notifications {expandedSection === 'notifications' ? '▴' : '▾'}
        </button>
        {expandedSection === 'notifications' && (
          <div className="settings-card">
            <label className="settings-toggle-row">
              <span>Push notifications</span>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={settings.pushNotificationsEnabled}
                onChange={(e) =>
                  handleSettingChange('pushNotificationsEnabled', e.target.checked)
                }
              />
            </label>
            <label className="settings-toggle-row">
              <span>In-app notifications</span>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={settings.inAppNotificationsEnabled}
                onChange={(e) =>
                  handleSettingChange('inAppNotificationsEnabled', e.target.checked)
                }
              />
            </label>
            <label className="settings-toggle-row">
              <span>Daily digest</span>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={settings.dailyDigestEnabled}
                onChange={(e) =>
                  handleSettingChange('dailyDigestEnabled', e.target.checked)
                }
              />
            </label>
            {settings.dailyDigestEnabled && (
              <label className="settings-toggle-row">
                <span>Digest time</span>
                <input
                  type="time"
                  className="settings-input-small"
                  value={settings.dailyDigestTime}
                  onChange={(e) =>
                    handleSettingChange('dailyDigestTime', e.target.value)
                  }
                />
              </label>
            )}
          </div>
        )}
      </section>

      {/* Accessibility */}
      <section className="settings-section">
        <button
          className="settings-section-title settings-section-toggle"
          onClick={() => toggleSection('accessibility')}
          aria-expanded={expandedSection === 'accessibility'}
        >
          Accessibility {expandedSection === 'accessibility' ? '▴' : '▾'}
        </button>
        {expandedSection === 'accessibility' && (
          <div className="settings-card">
            <label className="settings-toggle-row">
              <span>Font size: {settings.fontSize}%</span>
              <input
                type="range"
                className="settings-range"
                min={85}
                max={130}
                step={5}
                value={settings.fontSize}
                onChange={(e) =>
                  handleSettingChange('fontSize', parseInt(e.target.value))
                }
              />
            </label>
            <label className="settings-toggle-row">
              <span>Reduced motion</span>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={settings.reducedMotion}
                onChange={(e) =>
                  handleSettingChange('reducedMotion', e.target.checked)
                }
              />
            </label>
            <label className="settings-toggle-row">
              <span>High contrast</span>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={settings.highContrast}
                onChange={(e) =>
                  handleSettingChange('highContrast', e.target.checked)
                }
              />
            </label>
          </div>
        )}
      </section>

      {/* Display */}
      <section className="settings-section">
        <button
          className="settings-section-title settings-section-toggle"
          onClick={() => toggleSection('display')}
          aria-expanded={expandedSection === 'display'}
        >
          Display {expandedSection === 'display' ? '▴' : '▾'}
        </button>
        {expandedSection === 'display' && (
          <div className="settings-card">
            <label className="settings-toggle-row">
              <span>Red when tasks &gt;</span>
              <input
                type="number"
                className="settings-input-small"
                min={1}
                max={20}
                value={settings.heatmapThresholdHigh}
                onChange={(e) =>
                  handleSettingChange('heatmapThresholdHigh', parseInt(e.target.value) || 5)
                }
              />
            </label>
            <label className="settings-toggle-row">
              <span>Orange when tasks &ge;</span>
              <input
                type="number"
                className="settings-input-small"
                min={1}
                max={20}
                value={settings.heatmapThresholdMedium}
                onChange={(e) =>
                  handleSettingChange('heatmapThresholdMedium', parseInt(e.target.value) || 3)
                }
              />
            </label>
            <label className="settings-toggle-row">
              <span>Week starts on</span>
              <select
                className="settings-input-small"
                value={settings.weekStartsOn}
                onChange={(e) =>
                  handleSettingChange('weekStartsOn', e.target.value)
                }
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </label>
          </div>
        )}
      </section>

      {/* Data */}
      <section className="settings-section">
        <button
          className="settings-section-title settings-section-toggle"
          onClick={() => toggleSection('data')}
          aria-expanded={expandedSection === 'data'}
        >
          Data {expandedSection === 'data' ? '▴' : '▾'}
        </button>
        {expandedSection === 'data' && (
          <div className="settings-card">
            <div className="settings-toggle-row">
              <span>Export tasks (JSON)</span>
              <button
                className="settings-btn"
                onClick={() => showToast('Export coming in v1')}
              >
                Export
              </button>
            </div>
            <div className="settings-toggle-row">
              <span>Export tasks (CSV)</span>
              <button
                className="settings-btn"
                onClick={() => showToast('Export coming in v1')}
              >
                Export
              </button>
            </div>
            <div className="settings-toggle-row">
              <span>Import tasks</span>
              <button
                className="settings-btn"
                onClick={() => showToast('Import coming in v1')}
              >
                Import
              </button>
            </div>
          </div>
        )}
      </section>

      {/* About */}
      <section className="settings-section">
        <h3 className="settings-section-title">About</h3>
        <div className="settings-card">
          <div className="settings-about-row">Version 0.1.0 (MVP)</div>
        </div>
      </section>
    </div>
  );
}
