import React, { useState, useEffect, useCallback } from 'react';
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
import { Task, Category, PRIORITY_CONFIG } from '../../types';
import './MonthView.css';

type SubView = 'heatmap' | 'deadlines';

// Default thresholds (will come from settings later)
const THRESHOLD_HIGH = 5;
const THRESHOLD_MEDIUM = 3;

export default function MonthView() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subView, setSubView] = useState<SubView>('heatmap');

  const userId = currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    return subscribeToCategories(userId, setCategories);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToTasksForMonth(userId, currentDate, setTasks);
  }, [userId, currentDate]);

  const activeTasks = tasks.filter((t) => t.status === 'active');

  // Build calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Task count per day
  function getTasksForDay(date: Date): Task[] {
    return activeTasks.filter(
      (t) => t.dueDate && isSameDay(t.dueDate.toDate(), date)
    );
  }

  function getHeatmapColor(count: number): string {
    if (count > THRESHOLD_HIGH) return 'var(--color-heatmap-red)';
    if (count >= THRESHOLD_MEDIUM) return 'var(--color-heatmap-orange)';
    return 'var(--color-heatmap-green)';
  }

  function getHeatmapLabel(count: number): string {
    if (count > THRESHOLD_HIGH) return 'high load';
    if (count >= THRESHOLD_MEDIUM) return 'moderate load';
    return 'light load';
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

  return (
    <div className="month-view">
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

      {/* Heatmap */}
      {subView === 'heatmap' && (
        <div role="tabpanel">
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
                      className={`month-view-cell ${!inMonth ? 'month-view-cell--outside' : ''} ${today ? 'month-view-cell--today' : ''}`}
                      onClick={() => navigate(`/?date=${format(day, 'yyyy-MM-dd')}`)}
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
              <span>0–{THRESHOLD_MEDIUM - 1} tasks</span>
            </div>
            <div className="month-view-legend-item">
              <span className="month-view-legend-dot" style={{ background: 'var(--color-heatmap-orange)' }} />
              <span>{THRESHOLD_MEDIUM}–{THRESHOLD_HIGH} tasks</span>
            </div>
            <div className="month-view-legend-item">
              <span className="month-view-legend-dot" style={{ background: 'var(--color-heatmap-red)' }} />
              <span>{THRESHOLD_HIGH + 1}+ tasks</span>
            </div>
          </div>
        </div>
      )}

      {/* Deadlines Sub-View */}
      {subView === 'deadlines' && (
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
              <p>No deadlines this month.</p>
              <p className="month-view-empty-sub">Looking good!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
