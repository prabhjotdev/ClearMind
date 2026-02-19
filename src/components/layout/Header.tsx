import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSyncContext } from '../../contexts/SyncContext';
import NotificationPanel from '../notifications/NotificationPanel';
import './Header.css';

export default function Header() {
  const { currentUser, signOut } = useAuth();
  const { isSyncing, isOffline } = useSyncContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const handleCountChange = useCallback((count: number) => {
    setNotifCount(count);
  }, []);

  return (
    <header className="app-header">
      <h1 className="app-header-title">ClearMind</h1>

      <div className="app-header-actions">
        {/* Sync indicator */}
        {(isSyncing || isOffline) && (
          <div
            className={`app-header-sync ${isOffline ? 'app-header-sync--offline' : 'app-header-sync--syncing'}`}
            aria-label={isOffline ? 'No internet connection' : 'Saving…'}
            title={isOffline ? 'No internet connection' : 'Saving…'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {isOffline ? (
                /* Cloud with X */
                <>
                  <path d="M18.36 18.36A9 9 0 0 1 3 12a9 9 0 0 1 6-8.48" />
                  <path d="M6.73 6.73A8.96 8.96 0 0 0 3 12a9 9 0 0 0 9 9 8.96 8.96 0 0 0 5.27-1.73" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                /* Cloud upload/sync */
                <>
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </>
              )}
            </svg>
          </div>
        )}

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
