import React from 'react';
import { Task, Category, PRIORITY_CONFIG } from '../../types';
import { format } from 'date-fns';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  category?: Category;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onClick: (task: Task) => void;
  showDate?: boolean;
}

export default function TaskCard({
  task,
  category,
  onComplete,
  onDelete,
  onClick,
  showDate = false,
}: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const isCompleted = task.status === 'completed';

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation();
    onComplete(task.id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(task);
    }
  }

  const dueDateStr = task.dueDate && showDate
    ? format(task.dueDate.toDate(), 'EEE MMM d')
    : '';
  const dueTimeStr = task.dueTime || '';
  const metaParts: string[] = [];
  if (showDate && dueDateStr) metaParts.push(dueDateStr);
  if (dueTimeStr) metaParts.push(dueTimeStr.replace(/^(\d{2}):(\d{2})$/, (_, h, m) => {
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }));

  return (
    <article
      className={`task-card ${isCompleted ? 'task-card--completed' : ''}`}
      style={{ '--priority-color': priorityConfig.color } as React.CSSProperties}
      onClick={() => onClick(task)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`${task.name}, ${priorityConfig.label}${dueTimeStr ? `, due ${dueTimeStr}` : ''}${category ? `, ${category.name}` : ''}`}
    >
      <div
        className="task-card-checkbox"
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        tabIndex={0}
        onClick={handleCheckboxClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onComplete(task.id);
          }
        }}
      >
        {isCompleted && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M2 7L5.5 10.5L12 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div className="task-card-content">
        <span className="task-card-name">{task.name}</span>
        <div className="task-card-meta">
          {metaParts.length > 0 && (
            <span className="task-card-time">
              {metaParts.join(' · ')}
            </span>
          )}
          {category && (
            <span
              className="task-card-category"
              style={{ background: category.color + '1A', color: category.color }}
            >
              {category.icon} {category.name}
            </span>
          )}
          {task.repeat !== 'none' && (
            <>
              <span className="task-card-icon" aria-hidden="true">🔁</span>
              <span className="sr-only">Repeats {task.repeat}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
