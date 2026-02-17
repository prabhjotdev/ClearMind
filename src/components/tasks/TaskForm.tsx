import React, { useState } from 'react';
import { TaskFormData, Category, Priority, RepeatMode, ReminderOffset } from '../../types';
import { REMINDER_OFFSET_OPTIONS } from '../../services/reminderService';
import './TaskForm.css';

interface TaskFormProps {
  categories: Category[];
  initialData?: Partial<TaskFormData>;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'P1', label: 'P1 Urgent' },
  { value: 'P2', label: 'P2 Important' },
  { value: 'P3', label: 'P3 Low' },
];

const REPEAT_OPTIONS: { value: RepeatMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function TaskForm({
  categories,
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save Task',
}: TaskFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState<Priority>(initialData?.priority || 'P3');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || '');
  const [dueDate, setDueDate] = useState<string>(
    initialData?.dueDate ? formatDateForInput(initialData.dueDate) : ''
  );
  const [dueTime, setDueTime] = useState(initialData?.dueTime || '');
  const [repeat, setRepeat] = useState<RepeatMode>(initialData?.repeat || 'none');
  const [reminders, setReminders] = useState<ReminderOffset[]>(initialData?.reminders || []);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showMore, setShowMore] = useState(
    !!(initialData?.description || initialData?.dueDate || initialData?.priority !== 'P3' || initialData?.repeat !== 'none' || (initialData?.reminders && initialData.reminders.length > 0))
  );
  const [error, setError] = useState('');

  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function addReminder(offsetMinutes: number) {
    // Don't add duplicates
    if (reminders.some((r) => r.offsetMinutes === offsetMinutes)) return;
    setReminders([...reminders, { offsetMinutes, type: 'both' }]);
    setShowReminderPicker(false);
  }

  function removeReminder(offsetMinutes: number) {
    setReminders(reminders.filter((r) => r.offsetMinutes !== offsetMinutes));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Task name is required');
      return;
    }

    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    setError('');
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      priority,
      categoryId,
      dueDate: dueDate ? new Date(dueDate + 'T00:00:00') : null,
      dueTime: dueTime || null,
      repeat,
      reminders,
    });
  }

  // Available reminder options (exclude already-added ones)
  const availableReminderOptions = REMINDER_OFFSET_OPTIONS.filter(
    (opt) => !reminders.some((r) => r.offsetMinutes === opt.value)
  );

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="task-form-header">
        <span className="task-form-handle" aria-hidden="true" />
      </div>

      {error && (
        <div className="task-form-error" role="alert">
          {error}
        </div>
      )}

      <div className="task-form-field">
        <label htmlFor="task-name" className="sr-only">Task name</label>
        <input
          id="task-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What do you need to do?"
          className="task-form-input task-form-input--name"
          autoFocus
          maxLength={200}
        />
      </div>

      <div className="task-form-field">
        <label className="task-form-label">Category</label>
        <div className="task-form-chips" role="radiogroup" aria-label="Category">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={categoryId === cat.id}
              className={`task-form-chip ${categoryId === cat.id ? 'task-form-chip--active' : ''}`}
              style={categoryId === cat.id ? { background: cat.color, color: 'white' } : {}}
              onClick={() => setCategoryId(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {!showMore && (
        <button
          type="button"
          className="task-form-toggle"
          onClick={() => setShowMore(true)}
        >
          + More options
        </button>
      )}

      {showMore && (
        <>
          <div className="task-form-field">
            <label className="task-form-label">Priority</label>
            <div className="task-form-chips" role="radiogroup" aria-label="Priority">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={priority === opt.value}
                  className={`task-form-chip ${priority === opt.value ? 'task-form-chip--active' : ''}`}
                  onClick={() => setPriority(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="task-form-row">
            <div className="task-form-field task-form-field--half">
              <label htmlFor="task-due-date" className="task-form-label">Due date</label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="task-form-input"
              />
            </div>

            {dueDate && (
              <div className="task-form-field task-form-field--half">
                <label htmlFor="task-due-time" className="task-form-label">Due time</label>
                <input
                  id="task-due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="task-form-input"
                />
              </div>
            )}
          </div>

          <div className="task-form-field">
            <label htmlFor="task-description" className="task-form-label">Description</label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes... (optional)"
              className="task-form-input task-form-textarea"
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="task-form-field">
            <label className="task-form-label">Repeat</label>
            <div className="task-form-chips" role="radiogroup" aria-label="Repeat">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={repeat === opt.value}
                  className={`task-form-chip ${repeat === opt.value ? 'task-form-chip--active' : ''}`}
                  onClick={() => setRepeat(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reminders */}
          <div className="task-form-field">
            <label className="task-form-label">Reminders</label>

            {/* Existing reminders */}
            {reminders.length > 0 && (
              <div className="task-form-reminder-list">
                {reminders.map((r) => {
                  const option = REMINDER_OFFSET_OPTIONS.find(
                    (o) => o.value === r.offsetMinutes
                  );
                  return (
                    <div key={r.offsetMinutes} className="task-form-reminder-item">
                      <span className="task-form-reminder-icon" aria-hidden="true">🔔</span>
                      <span className="task-form-reminder-label">
                        {option?.label || `${r.offsetMinutes}m before`}
                      </span>
                      <button
                        type="button"
                        className="task-form-reminder-remove"
                        onClick={() => removeReminder(r.offsetMinutes)}
                        aria-label={`Remove reminder: ${option?.label}`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add reminder button / picker */}
            {!showReminderPicker ? (
              <button
                type="button"
                className="task-form-reminder-add"
                onClick={() => setShowReminderPicker(true)}
                disabled={!dueDate || !dueTime}
              >
                + Add reminder
                {(!dueDate || !dueTime) && (
                  <span className="task-form-reminder-hint">
                    (set date & time first)
                  </span>
                )}
              </button>
            ) : (
              <div className="task-form-reminder-picker" role="listbox" aria-label="Choose reminder time">
                <div className="task-form-reminder-picker-header">
                  <span>When should we remind you?</span>
                  <button
                    type="button"
                    className="task-form-reminder-picker-close"
                    onClick={() => setShowReminderPicker(false)}
                    aria-label="Close reminder picker"
                  >
                    ✕
                  </button>
                </div>
                {availableReminderOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    className="task-form-reminder-option"
                    onClick={() => addReminder(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
                {availableReminderOptions.length === 0 && (
                  <div className="task-form-reminder-option task-form-reminder-option--disabled">
                    All reminder options added
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="task-form-toggle"
            onClick={() => setShowMore(false)}
          >
            - Less options
          </button>
        </>
      )}

      <div className="task-form-actions">
        <button type="button" className="task-form-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="task-form-submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
