import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

export default function Header() {
  const { currentUser, signOut } = useAuth();

  return (
    <header className="app-header">
      <h1 className="app-header-title">ClearMind</h1>

      <div className="app-header-actions">
        {currentUser && (
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
        )}
      </div>
    </header>
  );
}
