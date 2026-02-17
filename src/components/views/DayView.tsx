import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays, subDays, isToday, startOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  subscribeToTasksForDate,
  subscribeToOverdueTasks,
  completeTask,
  uncompleteTask,
  softDeleteTask,
  restoreTask,
  rescheduleOverdueTasks,
  groupTasksByPriority,
  createTask,
  updateTask,
} from '../../services/taskService';
import {
  scheduleRemindersForTask,
  cancelRemindersForTask,
} from '../../services/reminderService';
import { subscribeToCategories, createDefaultCategories } from '../../services/categoryService';
import { requestNotificationPermission } from '../../services/notificationService';
import { Task, Category, Priority, PRIORITY_CONFIG, TaskFormData } from '../../types';
import TaskCard from '../tasks/TaskCard';
import TaskForm from '../tasks/TaskForm';
import TaskDetail from '../tasks/TaskDetail';
import BottomSheet from '../common/BottomSheet';
import FAB from '../common/FAB';
import './DayView.css';

export default function DayView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showOverdue, setShowOverdue] = useState(true);

  const userId = currentUser?.uid;

  // Load categories
  useEffect(() => {
    if (!userId) return;
    createDefaultCategories(userId);
    return subscribeToCategories(userId, setCategories);
  }, [userId]);

  // Load tasks for current date
  useEffect(() => {
    if (!userId) return;
    return subscribeToTasksForDate(userId, currentDate, setTasks);
  }, [userId, currentDate]);

  // Load overdue tasks (only when viewing today)
  useEffect(() => {
    if (!userId || !isToday(currentDate)) {
      setOverdueTasks([]);
      return;
    }
    return subscribeToOverdueTasks(userId, setOverdueTasks);
  }, [userId, currentDate]);

  const getCategoryForTask = useCallback(
    (task: Task) => categories.find((c) => c.id === task.categoryId),
    [categories]
  );

  async function handleComplete(taskId: string) {
    if (!userId) return;
    const task = tasks.find((t) => t.id === taskId) || overdueTasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.status === 'completed') {
      await uncompleteTask(userId, taskId);
      showToast(`"${task.name}" restored`);
    } else {
      await completeTask(userId, taskId);
      // Cancel any pending reminders
      await cancelRemindersForTask(userId, taskId);
      showToast(`"${task.name}" completed`, () => uncompleteTask(userId, taskId));
    }
  }

  async function handleDelete(taskId: string) {
    if (!userId) return;
    const task = tasks.find((t) => t.id === taskId) || overdueTasks.find((t) => t.id === taskId);
    if (!task) return;

    await softDeleteTask(userId, taskId);
    // Cancel any pending reminders
    await cancelRemindersForTask(userId, taskId);
    showToast(`"${task.name}" deleted`, () => restoreTask(userId, taskId));
    setSelectedTask(null);
  }

  async function handleCreate(formData: TaskFormData) {
    if (!userId) return;
    // Default due date to current view date if none specified
    const data = {
      ...formData,
      dueDate: formData.dueDate || currentDate,
    };
    const taskId = await createTask(userId, data);

    // Schedule reminders if task has date+time and reminders
    const taskDate = data.dueDate;
    if (taskDate && data.dueTime && data.reminders.length > 0) {
      // Request notification permission on first reminder creation
      await requestNotificationPermission(userId);
      await scheduleRemindersForTask(
        userId,
        taskId,
        data.name,
        taskDate instanceof Date ? taskDate : new Date(taskDate),
        data.dueTime,
        data.reminders
      );
    }

    setShowCreateForm(false);
    showToast('Task created');
  }

  async function handleEdit(formData: TaskFormData) {
    if (!userId || !editingTask) return;
    await updateTask(userId, editingTask.id, formData);

    // Re-schedule reminders
    const taskDate = formData.dueDate;
    if (taskDate && formData.dueTime && formData.reminders.length > 0) {
      await scheduleRemindersForTask(
        userId,
        editingTask.id,
        formData.name,
        taskDate,
        formData.dueTime,
        formData.reminders
      );
    } else {
      // No reminders — cancel any existing
      await cancelRemindersForTask(userId, editingTask.id);
    }

    setEditingTask(null);
    setSelectedTask(null);
    showToast('Task updated');
  }

  async function handleRescheduleOverdue() {
    if (!userId) return;
    const ids = overdueTasks.map((t) => t.id);
    await rescheduleOverdueTasks(userId, ids, new Date());
    showToast(`${ids.length} task(s) moved to today`);
  }

  function goToPreviousDay() {
    setCurrentDate((d) => subDays(d, 1));
  }

  function goToNextDay() {
    setCurrentDate((d) => addDays(d, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const activeTasks = tasks.filter((t) => t.status === 'active');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const grouped = groupTasksByPriority(activeTasks);
  const totalActive = activeTasks.length;
  const totalCompleted = completedTasks.length;
  const totalAll = totalActive + totalCompleted;

  return (
    <div className="day-view">
      {/* Date Navigation */}
      <div className="day-view-nav">
        <button
          className="day-view-nav-btn"
          onClick={goToPreviousDay}
          aria-label="Previous day"
        >
          ←
        </button>
        <h2 className="day-view-date">
          {format(currentDate, 'EEEE, MMM d')}
        </h2>
        <button
          className="day-view-nav-btn"
          onClick={goToNextDay}
          aria-label="Next day"
        >
          →
        </button>
      </div>

      {!isToday(currentDate) && (
        <button className="day-view-today-pill" onClick={goToToday}>
          Today
        </button>
      )}

      {/* Summary */}
      <div className="day-view-summary">
        <span>{totalAll} task{totalAll !== 1 ? 's' : ''} today</span>
        {totalCompleted > 0 && (
          <span className="day-view-summary-done"> · {totalCompleted} done</span>
        )}
        {totalAll > 0 && (
          <div className="day-view-progress">
            <div
              className="day-view-progress-bar"
              style={{ width: `${(totalCompleted / totalAll) * 100}%` }}
              role="progressbar"
              aria-valuenow={totalCompleted}
              aria-valuemin={0}
              aria-valuemax={totalAll}
              aria-label={`${totalCompleted} of ${totalAll} tasks complete`}
            />
          </div>
        )}
      </div>

      {/* Overdue Section */}
      {overdueTasks.length > 0 && isToday(currentDate) && (
        <div className="day-view-overdue">
          <button
            className="day-view-overdue-header"
            onClick={() => setShowOverdue(!showOverdue)}
            aria-expanded={showOverdue}
          >
            ⚠ {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
          </button>
          {showOverdue && (
            <>
              <div className="day-view-task-list">
                {overdueTasks.map((task) => (
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
              <div className="day-view-overdue-actions">
                <button
                  className="day-view-overdue-btn day-view-overdue-btn--primary"
                  onClick={handleRescheduleOverdue}
                >
                  Reschedule All to Today
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Task Sections by Priority */}
      {((['P1', 'P2', 'P3'] as Priority[]).map((priority) => {
        const group = grouped[priority];
        if (group.length === 0) return null;
        const config = PRIORITY_CONFIG[priority];

        return (
          <section key={priority} className="day-view-section">
            <h3 className="day-view-section-header" style={{ color: config.color }}>
              {config.label} ({group.length})
            </h3>
            <div className="day-view-task-list">
              {group.map((task) => (
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
        );
      }))}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <section className="day-view-section day-view-section--completed">
          <h3 className="day-view-section-header day-view-section-header--completed">
            Completed ({completedTasks.length})
          </h3>
          <div className="day-view-task-list">
            {completedTasks.map((task) => (
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
      )}

      {/* Empty State */}
      {totalAll === 0 && overdueTasks.length === 0 && (
        <div className="day-view-empty">
          <div className="day-view-empty-icon" aria-hidden="true">🌿</div>
          <p className="day-view-empty-title">All clear for today!</p>
          <p className="day-view-empty-text">Enjoy your free time.</p>
          <button
            className="day-view-empty-cta"
            onClick={() => setShowCreateForm(true)}
          >
            + Add a task
          </button>
        </div>
      )}

      {/* FAB */}
      <FAB onClick={() => setShowCreateForm(true)} />

      {/* Create Task Sheet */}
      <BottomSheet
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        ariaLabel="Add new task"
      >
        <TaskForm
          categories={categories}
          initialData={{ dueDate: currentDate }}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      </BottomSheet>

      {/* Task Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedTask && !editingTask}
        onClose={() => setSelectedTask(null)}
        ariaLabel="Task details"
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            category={getCategoryForTask(selectedTask)}
            onComplete={() => handleComplete(selectedTask.id)}
            onEdit={() => setEditingTask(selectedTask)}
            onDelete={() => handleDelete(selectedTask.id)}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </BottomSheet>

      {/* Edit Task Sheet */}
      <BottomSheet
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        ariaLabel="Edit task"
      >
        {editingTask && (
          <TaskForm
            categories={categories}
            initialData={{
              name: editingTask.name,
              description: editingTask.description,
              priority: editingTask.priority,
              categoryId: editingTask.categoryId,
              dueDate: editingTask.dueDate?.toDate() || null,
              dueTime: editingTask.dueTime,
              repeat: editingTask.repeat,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingTask(null)}
            submitLabel="Save Changes"
          />
        )}
      </BottomSheet>
    </div>
  );
}
