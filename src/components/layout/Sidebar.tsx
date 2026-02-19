import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../common/Logo';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Today' },
  { to: '/week', label: 'Week' },
  { to: '/month', label: 'Month' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <Logo size={30} className="sidebar-brand-logo" />
        <h2>ClearMind</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-divider" />

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
          }
        >
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
