import React, { useState } from 'react';
import { TaskFormData, Category, Priority, RepeatMode } from '../../types';
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
  const [showMore, setShowMore] = useState(
    !!(initialData?.description || initialData?.dueDate || initialData?.priority !== 'P3' || initialData?.repeat !== 'none')
  );
  const [error, setError] = useState('');

  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
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
      reminders: [],
    });
  }

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
