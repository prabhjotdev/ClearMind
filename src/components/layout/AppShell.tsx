import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import './AppShell.css';

export default function AppShell() {
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
