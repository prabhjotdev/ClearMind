import React, { useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useKeyboardShortcuts } from '../../contexts/KeyboardShortcutsContext';
import { useReminderChecker } from '../../hooks/useReminderChecker';
import { useTimezoneGuard } from '../../hooks/useTimezoneGuard';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import KeyboardShortcutsHelp from '../common/KeyboardShortcutsHelp';
import './AppShell.css';

export default function AppShell() {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { isHelpVisible, showHelp, hideHelp } = useKeyboardShortcuts();
  const navigate = useNavigate();

  const shortcutsEnabled = settings.keyboardShortcutsEnabled;

  // Background reminder checker — polls for due reminders and fires local notifications
  useReminderChecker(currentUser?.uid);

  // Timezone mismatch detection — prompt once per session if timezone changed
  const handleTimezoneMismatch = useCallback(
    (newTz: string, accept: () => void) => {
      showToast(
        `Your timezone appears to be ${newTz}.`,
        accept,
        'Update'
      );
    },
    [showToast]
  );
  useTimezoneGuard(currentUser?.uid, userProfile, handleTimezoneMismatch);

  // Global navigation shortcuts
  useKeyboardShortcut('t', useCallback(() => navigate('/'), [navigate]), shortcutsEnabled);
  useKeyboardShortcut('w', useCallback(() => navigate('/week'), [navigate]), shortcutsEnabled);
  useKeyboardShortcut('m', useCallback(() => navigate('/month'), [navigate]), shortcutsEnabled);
  useKeyboardShortcut('?', useCallback(() => showHelp(), [showHelp]), shortcutsEnabled);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar />

      <div className="app-main-wrapper">
        <Header />

        <main id="main-content" className="app-main" role="main">
          <Outlet />
        </main>
      </div>

      <BottomNav />

      {isHelpVisible && <KeyboardShortcutsHelp onClose={hideHelp} />}
    </div>
  );
}
