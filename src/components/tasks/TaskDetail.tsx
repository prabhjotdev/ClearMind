import React from 'react';
import { Task, Category, PRIORITY_CONFIG } from '../../types';
import { format } from 'date-fns';
import './TaskDetail.css';

interface TaskDetailProps {
  task: Task;
  category?: Category;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function TaskDetail({
  task,
  category,
  onComplete,
  onEdit,
  onDelete,
  onClose,
}: TaskDetailProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const isCompleted = task.status === 'completed';

  return (
    <div className="task-detail">
      <div className="task-detail-header">
        <span className="task-form-handle" aria-hidden="true" />
      </div>

      <div
        className="task-detail-priority"
        style={{ color: priorityConfig.color }}
      >
        {priorityConfig.label}
      </div>

      <h2 className="task-detail-name">{task.name}</h2>

      {task.description && (
        <p className="task-detail-description">{task.description}</p>
      )}

      <div className="task-detail-fields">
        {task.dueDate && (
          <div className="task-detail-field">
            <span className="task-detail-field-icon" aria-hidden="true">📅</span>
            <span>
              {format(task.dueDate.toDate(), 'EEEE, MMM d, yyyy')}
              {task.dueTime && ` at ${task.dueTime.replace(/^(\d{2}):(\d{2})$/, (_, h, m) => {
                const hour = parseInt(h);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const h12 = hour % 12 || 12;
                return `${h12}:${m} ${ampm}`;
              })}`}
            </span>
          </div>
        )}

        {category && (
          <div className="task-detail-field">
            <span className="task-detail-field-icon" aria-hidden="true">{category.icon}</span>
            <span>{category.name}</span>
          </div>
        )}

        <div className="task-detail-field">
          <span className="task-detail-field-icon" aria-hidden="true">🔁</span>
          <span>{task.repeat === 'none' ? 'Does not repeat' : `Repeats ${task.repeat}`}</span>
        </div>
      </div>

      <div className="task-detail-timestamps">
        Created: {format(task.createdAt.toDate(), 'MMM d, yyyy')}
        {task.updatedAt && ` · Modified: ${format(task.updatedAt.toDate(), 'MMM d, yyyy')}`}
      </div>

      <div className="task-detail-actions">
        <button
          className={`task-detail-action ${isCompleted ? 'task-detail-action--undo' : 'task-detail-action--complete'}`}
          onClick={onComplete}
        >
          {isCompleted ? '↩ Undo' : '✓ Complete'}
        </button>
        <button className="task-detail-action task-detail-action--edit" onClick={onEdit}>
          ✏ Edit
        </button>
        <button className="task-detail-action task-detail-action--delete" onClick={onDelete}>
          🗑 Delete
        </button>
      </div>
    </div>
  );
}
