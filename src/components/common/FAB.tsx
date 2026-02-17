import React from 'react';
import './FAB.css';

interface FABProps {
  onClick: () => void;
  label?: string;
}

export default function FAB({ onClick, label = 'Add new task' }: FABProps) {
  return (
    <button
      className="fab"
      onClick={onClick}
      aria-label={label}
      type="button"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}
