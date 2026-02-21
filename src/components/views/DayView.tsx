import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, subDays, isToday, startOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
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
import {
  generateRepeatInstances,
  updateFutureInstances,
  stopRepeatSeries,
  fillRepeatWindowForUser,
} from '../../services/repeatService';
import { subscribeToCategories, createDefaultCategories } from '../../services/categoryService';
import { requestNotificationPermission } from '../../services/notificationService';
import { Task, Category, Priority, PRIORITY_CONFIG, TaskFormData } from '../../types';
import TaskCard from '../tasks/TaskCard';
import TaskForm from '../tasks/TaskForm';
import TaskDetail from '../tasks/TaskDetail';
import RepeatEditDialog, { RepeatEditChoice } from '../tasks/RepeatEditDialog';
import BottomSheet from '../common/BottomSheet';
import FAB from '../common/FAB';
import { TaskListSkeleton } from '../common/Skeleton';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import './DayView.css';

export default function DayView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [repeatChoiceTask, setRepeatChoiceTask] = useState<Task | null>(null);
  const [editAllFuture, setEditAllFuture] = useState(false);
  const [showOverdue, setShowOverdue] = useState(true);
  // Keyboard navigation: index into the flattened visible task list
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<number>(-1);
  const repeatWindowFilledRef = useRef(false);

  const userId = currentUser?.uid;
  const shortcutsEnabled = settings.keyboardShortcutsEnabled;

  // Load categories
  useEffect(() => {
    if (!userId) return;
    createDefaultCategories(userId);
    return subscribeToCategories(userId, setCategories);
  }, [userId]);

  // Fill the repeat rolling window on first load (client-side replacement for Cloud Function)
  useEffect(() => {
    if (!userId || repeatWindowFilledRef.current) return;
    repeatWindowFilledRef.current = true;
    fillRepeatWindowForUser(userId).then((count) => {
      if (count > 0) {
        console.log(`Generated ${count} repeat instances`);
      }
    }).catch((err) => {
      console.error('Error filling repeat window:', err);
    });
  }, [userId]);

  // Load tasks for current date
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    return subscribeToTasksForDate(userId, currentDate, (newTasks) => {
      setTasks(newTasks);
      setLoading(false);
    });
  }, [userId, currentDate]);

  // Load overdue tasks (only when viewing today)
  useEffect(() => {
    if (!userId || !isToday(currentDate)) {
      setOverdueTasks([]);
      return;
    }
    return subscribeToOverdueTasks(userId, setOverdueTasks);
  }, [userId, currentDate]);

  // Reset focused task index when tasks change
  useEffect(() => {
    setFocusedTaskIndex(-1);
  }, [currentDate]);

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
      await cancelRemindersForTask(userId, taskId);
      showToast(`"${task.name}" completed`, () => uncompleteTask(userId, taskId));
    }
  }

  async function handleDelete(taskId: string) {
    if (!userId) return;
    const task = tasks.find((t) => t.id === taskId) || overdueTasks.find((t) => t.id === taskId);
    if (!task) return;

    await softDeleteTask(userId, taskId);
    await cancelRemindersForTask(userId, taskId);
    showToast(`"${task.name}" deleted`, () => restoreTask(userId, taskId));
    setSelectedTask(null);
  }

  async function handleCreate(formData: TaskFormData) {
    if (!userId) return;
    const data = {
      ...formData,
      dueDate: formData.dueDate || currentDate,
    };
    const taskId = await createTask(userId, data);

    // Schedule reminders if task has date+time and reminders
    const taskDate = data.dueDate;
    if (taskDate && data.dueTime && data.reminders.length > 0) {
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

    // Generate repeat instances if repeating
    if (data.repeat !== 'none' && data.dueDate) {
      const fakeTask: Task = {
        id: taskId,
        name: data.name,
        description: data.description,
        priority: data.priority,
        categoryId: data.categoryId,
        dueDate: Timestamp.fromDate(startOfDay(data.dueDate)),
        dueTime: data.dueTime,
        repeat: data.repeat,
        repeatSeriesId: taskId,
        repeatOriginalDate: Timestamp.fromDate(startOfDay(data.dueDate)),
        status: 'active',
        completedAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
      };
      const count = await generateRepeatInstances(userId, fakeTask);
      if (count > 0) {
        showToast(`Task created with ${count} upcoming occurrences`);
        return;
      }
    }

    setShowCreateForm(false);
    showToast('Task created');
  }

  // When user taps "Edit" on a repeating task, show the choice dialog
  function handleEditRequest(task: Task) {
    if (task.repeat !== 'none' && task.repeatSeriesId) {
      setRepeatChoiceTask(task);
    } else {
      setEditingTask(task);
    }
  }

  async function handleRepeatChoice(choice: RepeatEditChoice) {
    if (!userId || !repeatChoiceTask) return;

    if (choice === 'this') {
      setEditAllFuture(false);
      setEditingTask(repeatChoiceTask);
      setRepeatChoiceTask(null);
    } else if (choice === 'all_future') {
      setEditAllFuture(true);
      setEditingTask(repeatChoiceTask);
      setRepeatChoiceTask(null);
    } else if (choice === 'stop') {
      const seriesId = repeatChoiceTask.repeatSeriesId || repeatChoiceTask.id;
      const deleted = await stopRepeatSeries(userId, repeatChoiceTask.id, seriesId);
      setRepeatChoiceTask(null);
      setSelectedTask(null);
      showToast(`Repeat stopped. ${deleted} future task(s) removed.`);
    }
  }

  async function handleEdit(formData: TaskFormData) {
    if (!userId || !editingTask) return;

    await updateTask(userId, editingTask.id, formData);

    // If editing all future instances of a repeat series
    if (editAllFuture && editingTask.repeatSeriesId) {
      await updateFutureInstances(userId, editingTask.repeatSeriesId, {
        name: formData.name,
        description: formData.description,
        priority: formData.priority,
        categoryId: formData.categoryId,
        dueTime: formData.dueTime,
      });
      showToast('All future tasks updated');
    } else {
      showToast('Task updated');
    }

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
      await cancelRemindersForTask(userId, editingTask.id);
    }

    setEditingTask(null);
    setEditAllFuture(false);
    setSelectedTask(null);
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

  // Flat ordered list used for j/k navigation (visual order)
  const allVisibleTasks: Task[] = [
    ...overdueTasks,
    ...(grouped['P1'] || []),
    ...(grouped['P2'] || []),
    ...(grouped['P3'] || []),
    ...completedTasks,
  ];

  const anySheetOpen = showCreateForm || !!selectedTask || !!editingTask || !!repeatChoiceTask;

  // ─── Keyboard shortcuts ─────────────────────────────────────

  useKeyboardShortcut(
    'n',
    useCallback(() => setShowCreateForm(true), []),
    shortcutsEnabled && !anySheetOpen
  );

  useKeyboardShortcut(
    'j',
    useCallback(() => {
      if (allVisibleTasks.length === 0) return;
      setFocusedTaskIndex((prev) =>
        prev < allVisibleTasks.length - 1 ? prev + 1 : prev
      );
    }, [allVisibleTasks.length]),
    shortcutsEnabled && !anySheetOpen
  );

  useKeyboardShortcut(
    'k',
    useCallback(() => {
      if (allVisibleTasks.length === 0) return;
      setFocusedTaskIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }, [allVisibleTasks.length]),
    shortcutsEnabled && !anySheetOpen
  );

  useKeyboardShortcut(
    'Enter',
    useCallback(() => {
      if (focusedTaskIndex < 0 || focusedTaskIndex >= allVisibleTasks.length) return;
      setSelectedTask(allVisibleTasks[focusedTaskIndex]);
    }, [focusedTaskIndex, allVisibleTasks]),
    shortcutsEnabled && !anySheetOpen
  );

  useKeyboardShortcut(
    'x',
    useCallback(() => {
      if (focusedTaskIndex < 0 || focusedTaskIndex >= allVisibleTasks.length) return;
      handleComplete(allVisibleTasks[focusedTaskIndex].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedTaskIndex, allVisibleTasks]),
    shortcutsEnabled && !anySheetOpen
  );

  useKeyboardShortcut(
    'Delete',
    useCallback(() => {
      if (focusedTaskIndex < 0 || focusedTaskIndex >= allVisibleTasks.length) return;
      handleDelete(allVisibleTasks[focusedTaskIndex].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedTaskIndex, allVisibleTasks]),
    shortcutsEnabled && !anySheetOpen
  );

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

      {/* Keyboard navigation hint */}
      {shortcutsEnabled && allVisibleTasks.length > 0 && focusedTaskIndex === -1 && (
        <p className="day-view-kbd-hint" aria-live="polite">
          Press <kbd>j</kbd> / <kbd>k</kbd> to navigate tasks, <kbd>?</kbd> for all shortcuts
        </p>
      )}

      {/* Skeleton loading */}
      {loading && (
        <>
          <TaskListSkeleton rows={2} />
          <TaskListSkeleton rows={3} />
        </>
      )}

      {/* Overdue Section */}
      {!loading && overdueTasks.length > 0 && isToday(currentDate) && (
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
                {overdueTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    category={getCategoryForTask(task)}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onClick={setSelectedTask}
                    showDate
                    isFocused={allVisibleTasks.indexOf(task) === focusedTaskIndex}
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
      {!loading && ((['P1', 'P2', 'P3'] as Priority[]).map((priority) => {
        const group = grouped[priority];
        if (group.length === 0) return null;
        const config = PRIORITY_CONFIG[priority];

        return (
          <section key={priority} className="day-view-section">
            <h3
              className="day-view-section-header"
              style={{ color: `var(--color-${priority.toLowerCase()})` }}
            >
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
                  isFocused={allVisibleTasks.indexOf(task) === focusedTaskIndex}
                />
              ))}
            </div>
          </section>
        );
      }))}

      {/* Completed tasks */}
      {!loading && completedTasks.length > 0 && (
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
                isFocused={allVisibleTasks.indexOf(task) === focusedTaskIndex}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && totalAll === 0 && overdueTasks.length === 0 && (
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
        isOpen={!!selectedTask && !editingTask && !repeatChoiceTask}
        onClose={() => setSelectedTask(null)}
        ariaLabel="Task details"
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            category={getCategoryForTask(selectedTask)}
            onComplete={() => handleComplete(selectedTask.id)}
            onEdit={() => handleEditRequest(selectedTask)}
            onDelete={() => handleDelete(selectedTask.id)}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </BottomSheet>

      {/* Repeat Edit Choice Dialog */}
      <BottomSheet
        isOpen={!!repeatChoiceTask}
        onClose={() => setRepeatChoiceTask(null)}
        ariaLabel="Edit repeating task options"
      >
        {repeatChoiceTask && (
          <RepeatEditDialog
            taskName={repeatChoiceTask.name}
            onChoice={handleRepeatChoice}
            onCancel={() => setRepeatChoiceTask(null)}
          />
        )}
      </BottomSheet>

      {/* Edit Task Sheet */}
      <BottomSheet
        isOpen={!!editingTask}
        onClose={() => { setEditingTask(null); setEditAllFuture(false); }}
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
            onCancel={() => { setEditingTask(null); setEditAllFuture(false); }}
            submitLabel={editAllFuture ? 'Save All Future' : 'Save Changes'}
          />
        )}
      </BottomSheet>
    </div>
  );
}
