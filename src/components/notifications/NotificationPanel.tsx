import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  subscribeToActiveReminders,
  snoozeReminder,
  incrementSnoozeCount,
  dismissReminder,
  SnoozeDuration,
  formatReminderOffset,
} from '../../services/reminderService';
import { Reminder } from '../../types';
import './NotificationPanel.css';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

const SNOOZE_OPTIONS: { value: SnoozeDuration; label: string }[] = [
  { value: 'fifteen_min', label: '15 min' },
  { value: 'one_hour', label: '1 hour' },
  { value: 'tomorrow', label: 'Tomorrow' },
];

const MAX_SNOOZE_COUNT = 5;

export default function NotificationPanel({
  isOpen,
  onClose,
  onCountChange,
}: NotificationPanelProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [snoozeOpenId, setSnoozeOpenId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const userId = currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    return subscribeToActiveReminders(userId, (data) => {
      setReminders(data);
      // Count sent + snoozed reminders as "active" notifications
      const activeCount = data.filter(
        (r) => r.status === 'sent' || r.status === 'snoozed'
      ).length;
      onCountChange(activeCount);
    });
  }, [userId, onCountChange]);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Check if click is on the bell button itself (to avoid double-toggle)
        const target = e.target as HTMLElement;
        if (target.closest('.app-header-bell')) return;
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  async function handleSnooze(reminder: Reminder, duration: SnoozeDuration) {
    if (!userId) return;

    if (reminder.snoozeCount >= MAX_SNOOZE_COUNT) {
      showToast('Maximum snooze limit reached');
      return;
    }

    await snoozeReminder(userId, reminder.id, duration);
    await incrementSnoozeCount(userId, reminder.id, reminder.snoozeCount);
    setSnoozeOpenId(null);

    const label = SNOOZE_OPTIONS.find((o) => o.value === duration)?.label || '';
    showToast(`Snoozed for ${label}`);
  }

  async function handleDismiss(reminder: Reminder) {
    if (!userId) return;
    await dismissReminder(userId, reminder.id);
    showToast('Reminder dismissed');
  }

  function getStatusLabel(reminder: Reminder): string {
    if (reminder.status === 'sent') return 'Due';
    if (reminder.status === 'snoozed') return 'Snoozed';
    return 'Upcoming';
  }

  function getScheduledTimeLabel(reminder: Reminder): string {
    const date = reminder.scheduledAt.toDate();
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    if (diffMs < 0) return 'Now';
    if (diffMs < 60000) return 'In < 1 min';
    if (diffMs < 3600000) return `In ${Math.round(diffMs / 60000)} min`;
    return format(date, 'MMM d, h:mm a');
  }

  // Sort: sent first, then snoozed, then scheduled
  const sortedReminders = [...reminders].sort((a, b) => {
    const order: Record<string, number> = { sent: 0, snoozed: 1, scheduled: 2 };
    const aOrder = order[a.status] ?? 3;
    const bOrder = order[b.status] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.scheduledAt.toMillis() - b.scheduledAt.toMillis();
  });

  if (!isOpen) return null;

  return (
    <div className="notification-panel" ref={panelRef} role="dialog" aria-label="Notifications">
      <div className="notification-panel-header">
        <h3 className="notification-panel-title">Notifications</h3>
        <button
          className="notification-panel-close"
          onClick={onClose}
          aria-label="Close notifications"
        >
          ✕
        </button>
      </div>

      <div className="notification-panel-body">
        {sortedReminders.length === 0 ? (
          <div className="notification-panel-empty">
            <p>No active reminders</p>
          </div>
        ) : (
          <div className="notification-panel-list">
            {sortedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`notification-item notification-item--${reminder.status}`}
              >
                <div className="notification-item-header">
                  <span className={`notification-item-badge notification-item-badge--${reminder.status}`}>
                    {getStatusLabel(reminder)}
                  </span>
                  <span className="notification-item-time">
                    {getScheduledTimeLabel(reminder)}
                  </span>
                </div>

                <p className="notification-item-task">{reminder.taskName}</p>
                <p className="notification-item-offset">
                  {formatReminderOffset(reminder.offsetMinutes)}
                </p>

                <div className="notification-item-actions">
                  {/* Snooze button */}
                  {reminder.snoozeCount < MAX_SNOOZE_COUNT ? (
                    snoozeOpenId === reminder.id ? (
                      <div className="notification-item-snooze-options">
                        {SNOOZE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            className="notification-item-snooze-btn"
                            onClick={() => handleSnooze(reminder, opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button
                          className="notification-item-snooze-cancel"
                          onClick={() => setSnoozeOpenId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="notification-item-action"
                        onClick={() => setSnoozeOpenId(reminder.id)}
                      >
                        Snooze ({MAX_SNOOZE_COUNT - reminder.snoozeCount} left)
                      </button>
                    )
                  ) : (
                    <span className="notification-item-snooze-maxed">
                      Max snoozes reached
                    </span>
                  )}

                  {/* Dismiss button */}
                  <button
                    className="notification-item-action notification-item-action--dismiss"
                    onClick={() => handleDismiss(reminder)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
