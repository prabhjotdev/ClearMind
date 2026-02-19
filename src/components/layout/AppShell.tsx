import React, { useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useReminderChecker } from '../../hooks/useReminderChecker';
import { useTimezoneGuard } from '../../hooks/useTimezoneGuard';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import './AppShell.css';

export default function AppShell() {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

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
    </div>
  );
}
