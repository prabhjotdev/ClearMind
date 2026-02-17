import React, { useState, useEffect, useCallback } from 'react';
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isThisWeek,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  subscribeToTasksForWeek,
  completeTask,
  uncompleteTask,
  softDeleteTask,
  restoreTask,
  groupTasksByPriority,
  sortTasksByPriority,
} from '../../services/taskService';
import { subscribeToCategories } from '../../services/categoryService';
import { Task, Category, Priority, PRIORITY_CONFIG } from '../../types';
import TaskCard from '../tasks/TaskCard';
import TaskDetail from '../tasks/TaskDetail';
import BottomSheet from '../common/BottomSheet';
import './WeekView.css';

type SubView = 'list' | 'deadlines';

export default function WeekView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subView, setSubView] = useState<SubView>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const userId = currentUser?.uid;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  useEffect(() => {
    if (!userId) return;
    return subscribeToCategories(userId, setCategories);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToTasksForWeek(userId, currentDate, 1, setTasks);
  }, [userId, currentDate]);

  const getCategoryForTask = useCallback(
    (task: Task) => categories.find((c) => c.id === task.categoryId),
    [categories]
  );

  async function handleComplete(taskId: string) {
    if (!userId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === 'completed') {
      await uncompleteTask(userId, taskId);
    } else {
      await completeTask(userId, taskId);
      showToast(`"${task.name}" completed`, () => uncompleteTask(userId, taskId));
    }
  }

  async function handleDelete(taskId: string) {
    if (!userId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await softDeleteTask(userId, taskId);
    showToast(`"${task.name}" deleted`, () => restoreTask(userId, taskId));
    setSelectedTask(null);
  }

  const activeTasks = tasks.filter((t) => t.status === 'active');

  // List sub-view: grouped by priority
  const grouped = groupTasksByPriority(activeTasks);

  // Deadlines sub-view: tasks with dueDate + dueTime, grouped by day
  const deadlineTasks = activeTasks.filter((t) => t.dueDate && t.dueTime);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const deadlinesByDay = weekDays.map((day) => ({
    date: day,
    tasks: deadlineTasks.filter(
      (t) => t.dueDate && isSameDay(t.dueDate.toDate(), day)
    ),
  })).filter((d) => d.tasks.length > 0);

  return (
    <div className="week-view">
      {/* Week Navigation */}
      <div className="week-view-nav">
        <button
          className="week-view-nav-btn"
          onClick={() => setCurrentDate((d) => subWeeks(d, 1))}
          aria-label="Previous week"
        >
          ←
        </button>
        <h2 className="week-view-date">
          Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
        </h2>
        <button
          className="week-view-nav-btn"
          onClick={() => setCurrentDate((d) => addWeeks(d, 1))}
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {!isThisWeek(currentDate, { weekStartsOn: 1 }) && (
        <button
          className="week-view-today-pill"
          onClick={() => setCurrentDate(new Date())}
        >
          This Week
        </button>
      )}

      {/* Sub-View Toggle */}
      <div className="week-view-toggle" role="tablist" aria-label="Week view mode">
        <button
          role="tab"
          aria-selected={subView === 'list'}
          className={`week-view-toggle-btn ${subView === 'list' ? 'week-view-toggle-btn--active' : ''}`}
          onClick={() => setSubView('list')}
        >
          List
        </button>
        <button
          role="tab"
          aria-selected={subView === 'deadlines'}
          className={`week-view-toggle-btn ${subView === 'deadlines' ? 'week-view-toggle-btn--active' : ''}`}
          onClick={() => setSubView('deadlines')}
        >
          Deadlines
        </button>
      </div>

      {/* List Sub-View */}
      {subView === 'list' && (
        <div role="tabpanel">
          {((['P1', 'P2', 'P3'] as Priority[]).map((priority) => {
            const group = grouped[priority];
            if (group.length === 0) return null;
            const config = PRIORITY_CONFIG[priority];
            return (
              <section key={priority} className="week-view-section">
                <h3 className="week-view-section-header" style={{ color: config.color }}>
                  {config.label} ({group.length})
                </h3>
                <div className="week-view-task-list">
                  {group.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      category={getCategoryForTask(task)}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                      onClick={setSelectedTask}
                      showDate
                    />
                  ))}
                </div>
              </section>
            );
          }))}

          {activeTasks.length === 0 && (
            <div className="week-view-empty">
              <p>No tasks this week yet.</p>
              <p className="week-view-empty-sub">Plan ahead — or enjoy the break!</p>
            </div>
          )}
        </div>
      )}

      {/* Deadlines Sub-View */}
      {subView === 'deadlines' && (
        <div role="tabpanel">
          {deadlinesByDay.map(({ date, tasks: dayTasks }) => (
            <section key={date.toISOString()} className="week-view-section">
              <h3 className="week-view-section-header">
                {format(date, 'EEEE, MMM d')}
              </h3>
              <div className="week-view-task-list">
                {dayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    category={getCategoryForTask(task)}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onClick={setSelectedTask}
                  />
                ))}
              </div>
            </section>
          ))}

          {deadlinesByDay.length === 0 && (
            <div className="week-view-empty">
              <p>No deadlines this week.</p>
              <p className="week-view-empty-sub">Looking manageable!</p>
            </div>
          )}
        </div>
      )}

      {/* Task Detail */}
      <BottomSheet
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        ariaLabel="Task details"
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            category={getCategoryForTask(selectedTask)}
            onComplete={() => handleComplete(selectedTask.id)}
            onEdit={() => {}}
            onDelete={() => handleDelete(selectedTask.id)}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
