import React, { useRef, useState, useCallback, useMemo } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { Task, Category, PRIORITY_CONFIG } from '../../types';
import './WeeklyCalendarGrid.css';

interface WeeklyCalendarGridProps {
  weekDays: Date[];
  tasks: Task[];
  categories: Category[];
  onTaskClick: (task: Task) => void;
  onReschedule: (taskId: string, newDate: Date, newTime: string | null) => void;
}

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_HEIGHT = 48; // px per hour slot
const TOTAL_HOURS = HOUR_END - HOUR_START;

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(':').map(Number);
  return { hours: h, minutes: m };
}

function timeToOffset(time: string): number {
  const { hours, minutes } = parseTime(time);
  return (hours - HOUR_START + minutes / 60) * HOUR_HEIGHT;
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12} ${ampm}`;
}

function offsetToTime(offsetY: number, gridTop: number): string {
  const relY = Math.max(0, offsetY - gridTop);
  const totalMinutes = (relY / HOUR_HEIGHT) * 60 + HOUR_START * 60;
  // Snap to 15-minute intervals
  const snapped = Math.round(totalMinutes / 15) * 15;
  const hours = Math.floor(snapped / 60);
  const minutes = snapped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function WeeklyCalendarGrid({
  weekDays,
  tasks,
  categories,
  onTaskClick,
  onReschedule,
}: WeeklyCalendarGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    taskId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);

  const getCategoryForTask = useCallback(
    (task: Task) => categories.find((c) => c.id === task.categoryId),
    [categories]
  );

  // Separate all-day tasks (no time) from timed tasks
  const { allDayTasks, timedTasks } = useMemo(() => {
    const allDay: Record<string, Task[]> = {};
    const timed: Record<string, Task[]> = {};

    weekDays.forEach((day) => {
      const key = day.toISOString();
      allDay[key] = [];
      timed[key] = [];
    });

    tasks.filter((t) => t.status === 'active').forEach((task) => {
      if (!task.dueDate) return;
      const taskDate = task.dueDate.toDate();
      const matchingDay = weekDays.find((d) => isSameDay(d, taskDate));
      if (!matchingDay) return;
      const key = matchingDay.toISOString();
      if (task.dueTime) {
        timed[key].push(task);
      } else {
        allDay[key].push(task);
      }
    });

    return { allDayTasks: allDay, timedTasks: timed };
  }, [tasks, weekDays]);

  const hasAnyAllDay = useMemo(
    () => Object.values(allDayTasks).some((arr) => arr.length > 0),
    [allDayTasks]
  );

  // Drag handlers
  function handleDragStart(e: React.MouseEvent | React.TouchEvent, taskId: string) {
    e.stopPropagation();
    const point = 'touches' in e ? e.touches[0] : e;
    setDragState({
      taskId,
      startX: point.clientX,
      startY: point.clientY,
      currentX: point.clientX,
      currentY: point.clientY,
      isDragging: false,
    });
  }

  function handleDragMove(e: React.MouseEvent | React.TouchEvent) {
    if (!dragState) return;
    const point = 'touches' in e ? e.touches[0] : e;
    const dx = Math.abs(point.clientX - dragState.startX);
    const dy = Math.abs(point.clientY - dragState.startY);

    setDragState((prev) =>
      prev
        ? {
            ...prev,
            currentX: point.clientX,
            currentY: point.clientY,
            isDragging: prev.isDragging || dx > 5 || dy > 5,
          }
        : null
    );
  }

  function handleDragEnd(e: React.MouseEvent | React.TouchEvent) {
    if (!dragState || !dragState.isDragging || !gridRef.current) {
      setDragState(null);
      return;
    }

    const point = 'changedTouches' in e ? e.changedTouches[0] : (e as React.MouseEvent);
    const gridRect = gridRef.current.getBoundingClientRect();

    // Determine which day column was dropped on
    const dayColumnWidth = gridRect.width / weekDays.length;
    const colIndex = Math.floor((point.clientX - gridRect.left) / dayColumnWidth);
    const clampedCol = Math.max(0, Math.min(weekDays.length - 1, colIndex));
    const newDate = weekDays[clampedCol];

    // Determine what time
    const newTime = offsetToTime(point.clientY - gridRect.top, 0);

    onReschedule(dragState.taskId, newDate, newTime);
    setDragState(null);
  }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

  return (
    <div className="calendar-grid-wrapper">
      {/* Day headers */}
      <div className="calendar-grid-header">
        <div className="calendar-grid-time-gutter" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`calendar-grid-day-header ${isToday(day) ? 'calendar-grid-day-header--today' : ''}`}
          >
            <span className="calendar-grid-day-name">{format(day, 'EEE')}</span>
            <span className="calendar-grid-day-num">{format(day, 'd')}</span>
          </div>
        ))}
      </div>

      {/* All-day tasks row */}
      {hasAnyAllDay && (
        <div className="calendar-grid-allday">
          <div className="calendar-grid-time-gutter calendar-grid-allday-label">
            All day
          </div>
          {weekDays.map((day) => {
            const key = day.toISOString();
            const dayAllDay = allDayTasks[key] || [];
            return (
              <div
                key={key}
                className={`calendar-grid-allday-cell ${isToday(day) ? 'calendar-grid-allday-cell--today' : ''}`}
              >
                {dayAllDay.map((task) => {
                  const priorityConfig = PRIORITY_CONFIG[task.priority];
                  return (
                    <button
                      key={task.id}
                      className="calendar-grid-allday-chip"
                      style={{ background: priorityConfig.color + '20', color: priorityConfig.color }}
                      onClick={() => onTaskClick(task)}
                      title={task.name}
                    >
                      {task.name}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div
        className="calendar-grid"
        ref={gridRef}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
      >
        {/* Time axis */}
        <div className="calendar-grid-time-axis">
          {hours.map((hour) => (
            <div
              key={hour}
              className="calendar-grid-time-label"
              style={{ top: (hour - HOUR_START) * HOUR_HEIGHT }}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="calendar-grid-columns">
          {weekDays.map((day) => {
            const key = day.toISOString();
            const dayTasks = timedTasks[key] || [];
            return (
              <div
                key={key}
                className={`calendar-grid-column ${isToday(day) ? 'calendar-grid-column--today' : ''}`}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="calendar-grid-hour-line"
                    style={{ top: (hour - HOUR_START) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Task blocks */}
                {dayTasks.map((task) => {
                  if (!task.dueTime) return null;
                  const top = timeToOffset(task.dueTime);
                  const priorityConfig = PRIORITY_CONFIG[task.priority];
                  const category = getCategoryForTask(task);
                  const isDraggingThis = dragState?.taskId === task.id && dragState.isDragging;

                  return (
                    <div
                      key={task.id}
                      className={`calendar-grid-block ${isDraggingThis ? 'calendar-grid-block--dragging' : ''}`}
                      style={{
                        top: isDraggingThis
                          ? top + (dragState!.currentY - dragState!.startY)
                          : top,
                        left: isDraggingThis
                          ? (dragState!.currentX - dragState!.startX)
                          : undefined,
                        borderLeftColor: priorityConfig.color,
                        background: priorityConfig.color + '12',
                      }}
                      onClick={(e) => {
                        if (!isDraggingThis) {
                          e.stopPropagation();
                          onTaskClick(task);
                        }
                      }}
                      onMouseDown={(e) => handleDragStart(e, task.id)}
                      onTouchStart={(e) => handleDragStart(e, task.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${task.name} at ${task.dueTime}`}
                    >
                      <span className="calendar-grid-block-name">{task.name}</span>
                      <span className="calendar-grid-block-time">
                        {task.dueTime.replace(/^(\d{2}):(\d{2})$/, (_, h, m) => {
                          const hour = parseInt(h);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const h12 = hour % 12 || 12;
                          return `${h12}:${m} ${ampm}`;
                        })}
                      </span>
                      {category && (
                        <span className="calendar-grid-block-category" style={{ color: category.color }}>
                          {category.icon}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
