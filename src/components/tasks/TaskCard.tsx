import React, { useRef, useState, useEffect, useCallback } from 'react';
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

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12L9 17L20 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

  // ─── Refs ────────────────────────────────────────────────────
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const cardRef     = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const leftIconRef  = useRef<HTMLDivElement>(null);
  const rightIconRef = useRef<HTMLDivElement>(null);

  // Active touch gesture data — never triggers re-renders
  const gestureRef = useRef<{
    startX: number; startY: number;
    locked: boolean; lastDx: number;
  } | null>(null);

  // Suppresses click after a real swipe commit
  const wasSwipedRef = useRef(false);

  // Only state needed: which direction the exit animation plays
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);

  // ─── Shared swipe visuals (stable ref to avoid stale closures) ──
  const applyVisualsRef = useRef<(dx: number) => void>(() => {});

  // ─── Snap-or-commit (stable ref to avoid stale closures) ────
  const snapOrCommitRef = useRef<(dx: number) => void>(() => {});

  useEffect(() => {
    applyVisualsRef.current = (dx: number) => {
      const action = dx < 0
        ? swipeLeftAction
        : (swipeLeftAction === 'complete' ? 'delete' : 'complete');
      const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);
      const color = action === 'complete' ? '#3B82F6' : '#EF4444';

      if (cardRef.current) {
        cardRef.current.style.transition = 'none';
        const scale = reducedMotion ? 1 : 1 - progress * 0.02;
        cardRef.current.style.transform = `translateX(${dx}px) scale(${scale})`;
        const tintAlpha = progress * 0.15;
        const tintColor = action === 'complete'
          ? `rgba(59, 130, 246, ${tintAlpha})`
          : `rgba(239, 68, 68, ${tintAlpha})`;
        cardRef.current.style.setProperty('--swipe-tint', tintColor);
      }
      if (backdropRef.current) {
        backdropRef.current.style.opacity = String(progress);
        backdropRef.current.style.backgroundColor = color;
      }
      const iconProgress = Math.min(progress * 2, 1);
      if (leftIconRef.current)  leftIconRef.current.style.opacity  = dx < 0 ? String(iconProgress) : '0';
      if (rightIconRef.current) rightIconRef.current.style.opacity = dx > 0 ? String(iconProgress) : '0';
    };
  }, [swipeLeftAction, reducedMotion]);

  useEffect(() => {
    snapOrCommitRef.current = (dx: number) => {
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        wasSwipedRef.current = true;
        const action = dx < 0
          ? swipeLeftAction
          : (swipeLeftAction === 'complete' ? 'delete' : 'complete');
        const exitDir = dx < 0 ? 'left' : 'right';

        if (reducedMotion) {
          if (cardRef.current)     { cardRef.current.style.transform = ''; cardRef.current.style.setProperty('--swipe-tint', 'transparent'); }
          if (backdropRef.current) { backdropRef.current.style.opacity = '0'; backdropRef.current.style.backgroundColor = ''; }
          if (leftIconRef.current)  leftIconRef.current.style.opacity = '0';
          if (rightIconRef.current) rightIconRef.current.style.opacity = '0';
          action === 'complete' ? onComplete(task.id) : onDelete(task.id);
        } else {
          setExiting(exitDir);
          setTimeout(() => {
            setExiting(null);
            if (cardRef.current)     { cardRef.current.style.transform = ''; cardRef.current.style.setProperty('--swipe-tint', 'transparent'); }
            if (backdropRef.current) { backdropRef.current.style.opacity = '0'; backdropRef.current.style.backgroundColor = ''; }
            if (leftIconRef.current)  leftIconRef.current.style.opacity = '0';
            if (rightIconRef.current) rightIconRef.current.style.opacity = '0';
            action === 'complete' ? onComplete(task.id) : onDelete(task.id);
          }, 260);
        }
      } else {
        // Snap back with spring feel
        if (cardRef.current) {
          cardRef.current.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
          cardRef.current.style.transform = 'translateX(0) scale(1)';
          cardRef.current.style.setProperty('--swipe-tint', 'transparent');
          const el = cardRef.current;
          setTimeout(() => { el.style.transition = ''; }, 310);
        }
        if (backdropRef.current) {
          backdropRef.current.style.opacity = '0';
          backdropRef.current.style.backgroundColor = '';
        }
        if (leftIconRef.current)  leftIconRef.current.style.opacity = '0';
        if (rightIconRef.current) rightIconRef.current.style.opacity = '0';
      }
    };
  }, [task.id, swipeLeftAction, reducedMotion, onComplete, onDelete]);

  // ─── Touch event listeners (non-passive touchmove) ───────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function onTouchStart(e: TouchEvent) {
      if (exiting) return;
      const t = e.touches[0];
      gestureRef.current = { startX: t.clientX, startY: t.clientY, locked: false, lastDx: 0 };
      wasSwipedRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      const g = gestureRef.current;
      if (!g) return;

      const t = e.touches[0];
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;

      if (!g.locked) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return; // dead zone
        if (Math.abs(dy) > Math.abs(dx) * 0.7) {
          // Clearly vertical — cancel and let browser scroll
          gestureRef.current = null;
          return;
        }
        g.locked = true;
      }

      // Non-passive listener: this actually prevents the page from scrolling
      e.preventDefault();

      g.lastDx = dx;
      applyVisualsRef.current(dx);
    }

    function onTouchEnd() {
      const g = gestureRef.current;
      gestureRef.current = null;
      if (!g || !g.locked) return;
      snapOrCommitRef.current(g.lastDx);
    }

    wrapper.addEventListener('touchstart',  onTouchStart, { passive: true });
    wrapper.addEventListener('touchmove',   onTouchMove,  { passive: false }); // ← the key fix
    wrapper.addEventListener('touchend',    onTouchEnd,   { passive: true });
    wrapper.addEventListener('touchcancel', onTouchEnd,   { passive: true });

    return () => {
      wrapper.removeEventListener('touchstart',  onTouchStart);
      wrapper.removeEventListener('touchmove',   onTouchMove);
      wrapper.removeEventListener('touchend',    onTouchEnd);
      wrapper.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [swipeLeftAction, exiting]);

  // ─── Desktop mouse swipe (pointer events, JSX props) ─────────
  const mouseRef = useRef<{ startX: number; locked: boolean; lastDx: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    mouseRef.current = { startX: e.clientX, locked: false, lastDx: 0 };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    wasSwipedRef.current = false;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return;
    const m = mouseRef.current;
    if (!m) return;

    const dx = e.clientX - m.startX;
    if (!m.locked) {
      if (Math.abs(dx) < 5) return;
      m.locked = true;
    }
    m.lastDx = dx;
    applyVisualsRef.current(dx);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return;
    const m = mouseRef.current;
    mouseRef.current = null;
    if (!m || !m.locked) return;
    snapOrCommitRef.current(m.lastDx);
  }

  function handlePointerCancel() {
    mouseRef.current = null;
    if (cardRef.current) { cardRef.current.style.transition = ''; cardRef.current.style.transform = ''; cardRef.current.style.setProperty('--swipe-tint', 'transparent'); }
    if (backdropRef.current) { backdropRef.current.style.opacity = '0'; backdropRef.current.style.backgroundColor = ''; }
    if (leftIconRef.current)  leftIconRef.current.style.opacity = '0';
    if (rightIconRef.current) rightIconRef.current.style.opacity = '0';
  }

  // ─── Keyboard & click handlers ───────────────────────────────
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

  // ─── Date/time formatting ────────────────────────────────────
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

  // Which icon appears on each side depends on swipeLeftAction setting
  const leftAction  = swipeLeftAction;                                          // left swipe action
  const rightAction = swipeLeftAction === 'complete' ? 'delete' : 'complete';  // right swipe action

  return (
    <div
      ref={wrapperRef}
      className="task-swipe-wrapper"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Backdrop — always in DOM, opacity/color driven by JS during swipe */}
      <div
        ref={backdropRef}
        className="task-swipe-bg"
        aria-hidden="true"
      >
        <div ref={leftIconRef} className="task-swipe-icon-slot task-swipe-icon-slot--left">
          {leftAction === 'complete' ? <CheckIcon /> : <TrashIcon />}
          <span className="task-swipe-icon-label">{leftAction === 'complete' ? 'Complete' : 'Delete'}</span>
        </div>
        <div ref={rightIconRef} className="task-swipe-icon-slot task-swipe-icon-slot--right">
          {rightAction === 'complete' ? <CheckIcon /> : <TrashIcon />}
          <span className="task-swipe-icon-label">{rightAction === 'complete' ? 'Complete' : 'Delete'}</span>
        </div>
      </div>

      <article
        ref={cardRef}
        className={`task-card ${isCompleted ? 'task-card--completed' : ''} ${isFocused ? 'task-card--kbd-focused' : ''} ${exitClass}`}
        style={{ '--priority-color': `var(--color-${task.priority.toLowerCase()})` } as React.CSSProperties}
        onClick={() => { if (!wasSwipedRef.current) onClick(task); }}
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
