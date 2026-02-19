import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToTasksForMonth } from '../../services/taskService';
import { subscribeToCategories } from '../../services/categoryService';
import { subscribeToSettings, initializeSettings } from '../../services/settingsService';
import { Task, Category, PRIORITY_CONFIG, UserSettings, DEFAULT_SETTINGS } from '../../types';
import { Skeleton } from '../common/Skeleton';
import './MonthView.css';

type SubView = 'heatmap' | 'deadlines';

export default function MonthView() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [subView, setSubView] = useState<SubView>('heatmap');
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    count: number;
    date: string;
  } | null>(null);
  const tooltipTimeout = useRef<number | null>(null);

  // Swipe state
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);

  const userId = currentUser?.uid;

  // Thresholds from settings
  const thresholdHigh = settings.heatmapThresholdHigh;
  const thresholdMedium = settings.heatmapThresholdMedium;

  useEffect(() => {
    if (!userId) return;
    return subscribeToCategories(userId, setCategories);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    initializeSettings(userId);
    return subscribeToSettings(userId, setSettings);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    return subscribeToTasksForMonth(userId, currentDate, (newTasks) => {
      setTasks(newTasks);
      setLoading(false);
    });
  }, [userId, currentDate]);

  const activeTasks = tasks.filter((t) => t.status === 'active');

  // Build calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  function getTasksForDay(date: Date): Task[] {
    return activeTasks.filter(
      (t) => t.dueDate && isSameDay(t.dueDate.toDate(), date)
    );
  }

  function getHeatmapColor(count: number): string {
    if (count > thresholdHigh) return 'var(--color-heatmap-red)';
    if (count >= thresholdMedium) return 'var(--color-heatmap-orange)';
    return 'var(--color-heatmap-green)';
  }

  function getHeatmapLabel(count: number): string {
    if (count > thresholdHigh) return 'high load';
    if (count >= thresholdMedium) return 'moderate load';
    return 'light load';
  }

  // Tooltip handlers
  function handleCellHover(e: React.MouseEvent, count: number, date: Date) {
    if (count === 0) return;
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      count,
      date: format(date, 'MMM d'),
    });
  }

  function handleCellLeave() {
    tooltipTimeout.current = window.setTimeout(() => {
      setTooltip(null);
    }, 150);
  }

  // Long-press for mobile
  const longPressTimer = useRef<number | null>(null);

  function handleCellTouchStart(e: React.TouchEvent, count: number, date: Date) {
    if (count === 0) return;
    const touch = e.touches[0];
    longPressTimer.current = window.setTimeout(() => {
      setTooltip({
        x: touch.clientX,
        y: touch.clientY - 48,
        count,
        date: format(date, 'MMM d'),
      });
    }, 400);
  }

  function handleCellTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Hide tooltip after a short delay
    tooltipTimeout.current = window.setTimeout(() => {
      setTooltip(null);
    }, 1500);
  }

  // Swipe handlers for month navigation
  function handleSwipeStart(e: React.TouchEvent) {
    swipeRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
    };
  }

  function handleSwipeEnd(e: React.TouchEvent) {
    if (!swipeRef.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - swipeRef.current.startX;
    const dy = endY - swipeRef.current.startY;
    swipeRef.current = null;

    // Only register horizontal swipes (dx > 50px and more horizontal than vertical)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) {
        setCurrentDate((d) => subMonths(d, 1));
      } else {
        setCurrentDate((d) => addMonths(d, 1));
      }
    }
  }

  // Deadlines: tasks with date + time, grouped by day
  const deadlineTasks = activeTasks.filter((t) => t.dueDate && t.dueTime);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const deadlinesByDay = daysInMonth
    .map((day) => ({
      date: day,
      tasks: deadlineTasks.filter(
        (t) => t.dueDate && isSameDay(t.dueDate.toDate(), day)
      ),
    }))
    .filter((d) => d.tasks.length > 0);

  const isCurrentMonth = isSameMonth(currentDate, new Date());
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totalActiveTasks = activeTasks.length;

  return (
    <div
      className="month-view"
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      {/* Month Navigation */}
      <div className="month-view-nav">
        <button
          className="month-view-nav-btn"
          onClick={() => setCurrentDate((d) => subMonths(d, 1))}
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className="month-view-date">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button
          className="month-view-nav-btn"
          onClick={() => setCurrentDate((d) => addMonths(d, 1))}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          className="month-view-today-pill"
          onClick={() => setCurrentDate(new Date())}
        >
          This Month
        </button>
      )}

      {/* Sub-View Toggle */}
      <div className="month-view-toggle" role="tablist" aria-label="Month view mode">
        <button
          role="tab"
          aria-selected={subView === 'heatmap'}
          className={`month-view-toggle-btn ${subView === 'heatmap' ? 'month-view-toggle-btn--active' : ''}`}
          onClick={() => setSubView('heatmap')}
        >
          Heatmap
        </button>
        <button
          role="tab"
          aria-selected={subView === 'deadlines'}
          className={`month-view-toggle-btn ${subView === 'deadlines' ? 'month-view-toggle-btn--active' : ''}`}
          onClick={() => setSubView('deadlines')}
        >
          Deadlines
        </button>
      </div>

      {/* Skeleton loading — show grid placeholder while tasks load */}
      {loading && (
        <div className="month-view-skeleton" aria-label="Loading…" aria-busy="true">
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <div key={rowIdx} className="month-view-skeleton-row">
              {Array.from({ length: 7 }).map((_, colIdx) => (
                <Skeleton
                  key={colIdx}
                  width="100%"
                  height="48px"
                  borderRadius="var(--radius-sm)"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Heatmap */}
      {!loading && subView === 'heatmap' && (
        <div role="tabpanel">
          {totalActiveTasks > 0 ? (
            <>
              <div className="month-view-grid" role="grid" aria-label="Monthly task heatmap">
                {/* Day headers */}
                <div className="month-view-grid-row month-view-grid-header" role="row">
                  {dayHeaders.map((d) => (
                    <div key={d} className="month-view-grid-header-cell" role="columnheader">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar cells */}
                {Array.from({ length: calDays.length / 7 }, (_, weekIdx) => (
                  <div key={weekIdx} className="month-view-grid-row" role="row">
                    {calDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
                      const dayTasks = getTasksForDay(day);
                      const count = dayTasks.length;
                      const inMonth = isSameMonth(day, currentDate);
                      const today = isToday(day);

                      return (
                        <button
                          key={day.toISOString()}
                          className={`month-view-cell ${!inMonth ? 'month-view-cell--outside' : ''} ${today ? 'month-view-cell--today' : ''} ${inMonth && count > 0 ? 'month-view-cell--has-tasks' : ''}`}
                          onClick={() => navigate(`/?date=${format(day, 'yyyy-MM-dd')}`)}
                          onMouseEnter={(e) => handleCellHover(e, count, day)}
                          onMouseLeave={handleCellLeave}
                          onTouchStart={(e) => handleCellTouchStart(e, count, day)}
                          onTouchEnd={handleCellTouchEnd}
                          aria-label={`${format(day, 'MMMM d')}, ${count} task${count !== 1 ? 's' : ''}, ${getHeatmapLabel(count)}`}
                          role="gridcell"
                        >
                          <span className="month-view-cell-date">{format(day, 'd')}</span>
                          {inMonth && count > 0 && (
                            <span
                              className="month-view-cell-dot"
                              style={{ background: getHeatmapColor(count) }}
                              aria-hidden="true"
                            />
                          )}
                          {inMonth && count > 0 && (
                            <span className="month-view-cell-count" aria-hidden="true">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="month-view-legend" aria-label="Heatmap legend">
                <div className="month-view-legend-item">
                  <span className="month-view-legend-dot" style={{ background: 'var(--color-heatmap-green)' }} />
                  <span>0–{thresholdMedium - 1} tasks</span>
                </div>
                <div className="month-view-legend-item">
                  <span className="month-view-legend-dot" style={{ background: 'var(--color-heatmap-orange)' }} />
                  <span>{thresholdMedium}–{thresholdHigh} tasks</span>
                </div>
                <div className="month-view-legend-item">
                  <span className="month-view-legend-dot" style={{ background: 'var(--color-heatmap-red)' }} />
                  <span>{thresholdHigh + 1}+ tasks</span>
                </div>
              </div>
            </>
          ) : (
            <div className="month-view-empty">
              <div className="month-view-empty-icon" aria-hidden="true">📅</div>
              <p>No tasks this month.</p>
              <p className="month-view-empty-sub">A blank canvas — plan something great!</p>
            </div>
          )}
        </div>
      )}

      {/* Deadlines Sub-View */}
      {!loading && subView === 'deadlines' && (
        <div role="tabpanel">
          {deadlinesByDay.map(({ date, tasks: dayTasks }) => (
            <section key={date.toISOString()} className="month-view-deadline-section">
              <h3 className="month-view-deadline-day">
                {format(date, 'EEEE, MMM d')}
              </h3>
              <div className="month-view-deadline-list">
                {dayTasks.map((task) => {
                  const config = PRIORITY_CONFIG[task.priority];
                  return (
                    <div key={task.id} className="month-view-deadline-item">
                      <span
                        className="month-view-deadline-dot"
                        style={{ background: config.color }}
                        aria-hidden="true"
                      />
                      <span className="month-view-deadline-name">{task.name}</span>
                      <span className="month-view-deadline-time">
                        {task.dueTime?.replace(/^(\d{2}):(\d{2})$/, (_, h, m) => {
                          const hour = parseInt(h);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const h12 = hour % 12 || 12;
                          return `${h12}:${m} ${ampm}`;
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {deadlinesByDay.length === 0 && (
            <div className="month-view-empty">
              <div className="month-view-empty-icon" aria-hidden="true">✨</div>
              <p>No deadlines this month.</p>
              <p className="month-view-empty-sub">Looking good!</p>
            </div>
          )}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="month-view-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
          role="tooltip"
        >
          <strong>{tooltip.count}</strong> task{tooltip.count !== 1 ? 's' : ''} on {tooltip.date}
        </div>
      )}
    </div>
  );
}
