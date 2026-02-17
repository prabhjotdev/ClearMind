import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useReminderChecker } from '../../hooks/useReminderChecker';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import './AppShell.css';

export default function AppShell() {
  const { currentUser } = useAuth();

  // Background reminder checker — polls for due reminders and fires local notifications
  useReminderChecker(currentUser?.uid);

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
