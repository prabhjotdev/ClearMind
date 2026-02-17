import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationPanel from '../notifications/NotificationPanel';
import './Header.css';

export default function Header() {
  const { currentUser, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const handleCountChange = useCallback((count: number) => {
    setNotifCount(count);
  }, []);

  return (
    <header className="app-header">
      <h1 className="app-header-title">ClearMind</h1>

      <div className="app-header-actions">
        {currentUser && (
          <>
            {/* Notification Bell */}
            <button
              className="app-header-bell"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} active)` : ''}`}
              aria-expanded={showNotifications}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifCount > 0 && (
                <span className="app-header-bell-badge" aria-hidden="true">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            <NotificationPanel
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              onCountChange={handleCountChange}
            />

            <div className="app-header-user">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt=""
                  className="app-header-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="app-header-avatar app-header-avatar--placeholder">
                  {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={signOut}
                className="app-header-signout"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
