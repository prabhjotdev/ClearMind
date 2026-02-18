import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { subscribeToSettings, updateSettings, initializeSettings } from '../../services/settingsService';
import { deleteAllTasks } from '../../services/taskService';
import {
  generateJSONExport,
  generateCSVExport,
  downloadFile,
  todayDateString,
  ExportScope,
} from '../../services/importExportService';
import { UserSettings, DEFAULT_SETTINGS } from '../../types';
import ImportModal from '../settings/ImportModal';
import './SettingsView.css';

export default function SettingsView() {
  const { currentUser, signOut } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();

  // Export / Import / Delete state
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const userId = currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    initializeSettings(userId);
    return subscribeToSettings(userId, setSettings);
  }, [userId]);

  // Focus the delete confirmation input when it appears
  useEffect(() => {
    if (showDeleteConfirm) {
      setTimeout(() => deleteInputRef.current?.focus(), 50);
    }
  }, [showDeleteConfirm]);

  async function handleSettingChange(key: keyof UserSettings, value: unknown) {
    if (!userId) return;
    await updateSettings(userId, { [key]: value });
  }

  function toggleSection(section: string) {
    setExpandedSection((prev) => (prev === section ? null : section));
  }

  // ─── Export handlers ───────────────────────────────────────

  async function handleExportJSON() {
    if (!userId || !currentUser) return;
    setExportingJSON(true);
    try {
      const json = await generateJSONExport(
        userId,
        exportScope,
        currentUser.email ?? '',
        settings
      );
      const filename = `clearmind-export-${todayDateString()}.json`;
      downloadFile(json, filename, 'application/json');
      const count = JSON.parse(json).tasks.length;
      showToast(`Exported ${count} task${count !== 1 ? 's' : ''}.`);
    } catch {
      showToast('Export failed. Please try again.');
    } finally {
      setExportingJSON(false);
    }
  }

  async function handleExportCSV() {
    if (!userId || !currentUser) return;
    setExportingCSV(true);
    try {
      const csv = await generateCSVExport(userId, exportScope, currentUser.email ?? '');
      const filename = `clearmind-export-${todayDateString()}.csv`;
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      const lines = csv.split('\n').length - 1; // subtract header
      showToast(`Exported ${lines} task${lines !== 1 ? 's' : ''}.`);
    } catch {
      showToast('Export failed. Please try again.');
    } finally {
      setExportingCSV(false);
    }
  }

  // ─── Delete all handler ────────────────────────────────────

  async function handleDeleteAll() {
    if (!userId || deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAllTasks(userId);
      showToast('All tasks deleted.');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } catch {
      showToast('Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
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
            {/* Export scope selector */}
            <label className="settings-toggle-row">
              <span>Export scope</span>
              <select
                className="settings-input-small"
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as ExportScope)}
              >
                <option value="all">All tasks</option>
                <option value="active">Active only</option>
              </select>
            </label>

            {/* JSON export */}
            <div className="settings-toggle-row">
              <span>Export as JSON</span>
              <button
                className="settings-btn"
                onClick={handleExportJSON}
                disabled={exportingJSON}
              >
                {exportingJSON ? 'Exporting…' : 'Export'}
              </button>
            </div>

            {/* CSV export */}
            <div className="settings-toggle-row">
              <span>Export as CSV</span>
              <button
                className="settings-btn"
                onClick={handleExportCSV}
                disabled={exportingCSV}
              >
                {exportingCSV ? 'Exporting…' : 'Export'}
              </button>
            </div>

            {/* Import */}
            <div className="settings-toggle-row">
              <span>Import tasks</span>
              <button
                className="settings-btn"
                onClick={() => setShowImportModal(true)}
              >
                Import
              </button>
            </div>

            {/* Delete all */}
            <div className="settings-delete-zone">
              {!showDeleteConfirm ? (
                <button
                  className="settings-btn settings-btn--danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete All Tasks
                </button>
              ) : (
                <div className="settings-delete-confirm">
                  <p className="settings-delete-warning">
                    This will permanently delete all your tasks and cannot be undone.
                    Type <strong>DELETE</strong> to confirm.
                  </p>
                  <input
                    ref={deleteInputRef}
                    type="text"
                    className="settings-delete-input"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    aria-label="Type DELETE to confirm"
                  />
                  <div className="settings-delete-actions">
                    <button
                      className="settings-btn"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      className="settings-btn settings-btn--danger"
                      onClick={handleDeleteAll}
                      disabled={deleteConfirmText !== 'DELETE' || deleting}
                    >
                      {deleting ? 'Deleting…' : 'Delete All'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Install App */}
      {canInstall && (
        <section className="settings-section">
          <div className="settings-card settings-install-card">
            <p className="settings-install-text">
              Install ClearMind for quick access and offline support.
            </p>
            <button
              className="settings-btn settings-btn--primary"
              onClick={async () => {
                const accepted = await promptInstall();
                showToast(accepted ? 'App installed!' : 'Install cancelled');
              }}
            >
              Install App
            </button>
          </div>
        </section>
      )}

      {/* About */}
      <section className="settings-section">
        <h3 className="settings-section-title">About</h3>
        <div className="settings-card">
          <div className="settings-about-row">
            Version 0.1.0 (MVP)
            {isInstalled && ' · Installed'}
          </div>
        </div>
      </section>

      {/* Import modal */}
      {showImportModal && userId && (
        <ImportModal
          userId={userId}
          onClose={() => setShowImportModal(false)}
          onImported={({ imported, skipped }) => {
            setShowImportModal(false);
            showToast(
              skipped > 0
                ? `Imported ${imported} task${imported !== 1 ? 's' : ''}, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}.`
                : `Imported ${imported} task${imported !== 1 ? 's' : ''}.`
            );
          }}
        />
      )}
    </div>
  );
}
