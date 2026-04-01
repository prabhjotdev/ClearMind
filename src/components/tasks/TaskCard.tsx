import React, { useRef, useState } from 'react';
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
  /** Highlighted via keyboard navigation (j/k shortcuts) */
  isFocused?: boolean;
  /** Which action fires on left swipe; opposite fires on right swipe */
  swipeLeftAction?: 'complete' | 'delete';
  /** When true, skip exit slide animation */
  reducedMotion?: boolean;
}

const SWIPE_THRESHOLD = 80; // px

export default function TaskCard({
  task,
  category,
  onComplete,
  onDelete,
  onClick,
  showDate = false,
  isFocused = false,
  swipeLeftAction = 'complete',
  reducedMotion = false,
}: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const isCompleted = task.status === 'completed';

  // ─── Swipe state ────────────────────────────────────────────
  const pointerRef = useRef<{ startX: number; startY: number; pointerId: number; locked: boolean } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);
  const isSwiping = swipeX !== 0;

  function actionForDelta(deltaX: number): 'complete' | 'delete' {
    const isLeft = deltaX < 0;
    if (swipeLeftAction === 'complete') return isLeft ? 'complete' : 'delete';
    return isLeft ? 'delete' : 'complete';
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // only left-mouse or touch
    pointerRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, locked: false };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointerRef.current || exiting) return;
    const deltaX = e.clientX - pointerRef.current.startX;
    const deltaY = e.clientY - pointerRef.current.startY;

    // Lock to horizontal only after the gesture is clearly horizontal
    if (!pointerRef.current.locked) {
      if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return; // dead zone
      if (Math.abs(deltaY) > Math.abs(deltaX) * 0.6) {
        // Vertical — cancel the swipe so scroll works
        pointerRef.current = null;
        return;
      }
      pointerRef.current.locked = true;
    }

    e.preventDefault();
    setSwipeX(deltaX);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointerRef.current) return;
    const deltaX = e.clientX - pointerRef.current.startX;
    pointerRef.current = null;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      const action = actionForDelta(deltaX);
      const exitDir = deltaX < 0 ? 'left' : 'right';
      if (reducedMotion) {
        setSwipeX(0);
        action === 'complete' ? onComplete(task.id) : onDelete(task.id);
      } else {
        setExiting(exitDir);
        setTimeout(() => {
          setSwipeX(0);
          setExiting(null);
          action === 'complete' ? onComplete(task.id) : onDelete(task.id);
        }, 250);
      }
    } else {
      setSwipeX(0);
    }
  }

  function handlePointerCancel() {
    pointerRef.current = null;
    setSwipeX(0);
  }

  // ─── Derived swipe display ──────────────────────────────────
  const swipeAction = swipeX !== 0 ? actionForDelta(swipeX) : null;
  const swipeProgress = Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1);

  // ─── Card click (only fire if not swiping) ──────────────────
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

  const exitClass = exiting === 'left'
    ? 'task-card--exiting-left'
    : exiting === 'right'
      ? 'task-card--exiting-right'
      : '';

  return (
    <div
      className="task-swipe-wrapper"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Colored background revealed as the card slides */}
      {swipeAction && (
        <div
          className={`task-swipe-bg task-swipe-bg--${swipeAction}`}
          style={{ opacity: swipeProgress }}
          aria-hidden="true"
        >
          {swipeAction === 'complete' ? (
            <svg className="task-swipe-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L9 17L20 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="task-swipe-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      <article
        className={`task-card ${isCompleted ? 'task-card--completed' : ''} ${isFocused ? 'task-card--kbd-focused' : ''} ${exitClass}`}
        style={{
          '--priority-color': `var(--color-${task.priority.toLowerCase()})`,
          transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
          transition: swipeX !== 0 ? 'none' : undefined,
        } as React.CSSProperties}
        onClick={() => {
          if (!isSwiping) onClick(task);
        }}
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
    </div>
  );
}
