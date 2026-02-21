import React, { useEffect, useRef } from 'react';
import './KeyboardShortcutsHelp.css';

interface ShortcutRow {
  key: string;
  action: string;
  context: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { key: 'n', action: 'New task', context: 'Any view' },
  { key: 't', action: 'Go to Today', context: 'Any view' },
  { key: 'w', action: 'Go to Week view', context: 'Any view' },
  { key: 'm', action: 'Go to Month view', context: 'Any view' },
  { key: 'j', action: 'Next task', context: 'List views' },
  { key: 'k', action: 'Previous task', context: 'List views' },
  { key: 'Enter', action: 'Open task detail', context: 'Task focused' },
  { key: 'x', action: 'Toggle complete', context: 'Task focused' },
  { key: 'Delete', action: 'Delete task', context: 'Task focused' },
  { key: 'Escape', action: 'Close modal / sheet', context: 'When open' },
  { key: '?', action: 'Show this help', context: 'Any view' },
];

interface Props {
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save focus and trap it inside dialog
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Basic focus trap: Tab stays within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div
        className="ksh-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="ksh-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="ksh-header">
          <h2 className="ksh-title">Keyboard Shortcuts</h2>
          <button
            className="ksh-close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            ✕
          </button>
        </div>

        <table className="ksh-table">
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Action</th>
              <th scope="col">Context</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(({ key, action, context }) => (
              <tr key={key}>
                <td>
                  <kbd className="ksh-kbd">{key}</kbd>
                </td>
                <td>{action}</td>
                <td className="ksh-context">{context}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="ksh-hint">
          Enable or disable shortcuts in Settings → Accessibility.
        </p>
      </div>
    </>
  );
}
