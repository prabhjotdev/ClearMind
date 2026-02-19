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
  rescheduleTaskWithTime,
  groupTasksByPriority,
  createTask,
  updateTask,
} from '../../services/taskService';
import {
  scheduleRemindersForTask,
  cancelRemindersForTask,
} from '../../services/reminderService';
import { requestNotificationPermission } from '../../services/notificationService';
import { subscribeToCategories } from '../../services/categoryService';
import { Task, Category, Priority, PRIORITY_CONFIG, TaskFormData } from '../../types';
import TaskCard from '../tasks/TaskCard';
import TaskForm from '../tasks/TaskForm';
import TaskDetail from '../tasks/TaskDetail';
import RepeatEditDialog, { RepeatEditChoice } from '../tasks/RepeatEditDialog';
import WeeklyCalendarGrid from './WeeklyCalendarGrid';
import BottomSheet from '../common/BottomSheet';
import FAB from '../common/FAB';
import { TaskListSkeleton } from '../common/Skeleton';
import './WeekView.css';

type SubView = 'calendar' | 'list' | 'deadlines';

export default function WeekView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subView, setSubView] = useState<SubView>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [repeatChoiceTask, setRepeatChoiceTask] = useState<Task | null>(null);
  const [editAllFuture, setEditAllFuture] = useState(false);

  const userId = currentUser?.uid;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (!userId) return;
    return subscribeToCategories(userId, setCategories);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    return subscribeToTasksForWeek(userId, currentDate, 1, (newTasks) => {
      setTasks(newTasks);
      setLoading(false);
    });
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
      showToast(`"${task.name}" restored`);
    } else {
      await completeTask(userId, taskId);
      await cancelRemindersForTask(userId, taskId);
      showToast(`"${task.name}" completed`, () => uncompleteTask(userId, taskId));
    }
  }

  async function handleDelete(taskId: string) {
    if (!userId) return;
    const task = tasks.find((t) => t.id === taskId);
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
      dueDate: formData.dueDate || new Date(),
    };
    const taskId = await createTask(userId, data);

    if (data.dueDate && data.dueTime && data.reminders.length > 0) {
      await requestNotificationPermission(userId);
      await scheduleRemindersForTask(
        userId,
        taskId,
        data.name,
        data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate),
        data.dueTime,
        data.reminders
      );
    }

    setShowCreateForm(false);
    showToast('Task created');
  }

  function handleEditRequest(task: Task) {
    if (task.repeat !== 'none' && task.repeatSeriesId) {
      setRepeatChoiceTask(task);
    } else {
      setEditingTask(task);
    }
  }

  async function handleRepeatChoice(choice: RepeatEditChoice) {
    if (!userId || !repeatChoiceTask) return;
    const { updateFutureInstances, stopRepeatSeries } = await import('../../services/repeatService');

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

    if (editAllFuture && editingTask.repeatSeriesId) {
      const { updateFutureInstances } = await import('../../services/repeatService');
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

  async function handleCalendarReschedule(taskId: string, newDate: Date, newTime: string | null) {
    if (!userId) return;
    await rescheduleTaskWithTime(userId, taskId, newDate, newTime);
    const task = tasks.find((t) => t.id === taskId);
    showToast(
      `"${task?.name || 'Task'}" moved to ${format(newDate, 'EEE')}${newTime ? ` at ${newTime}` : ''}`
    );
  }

  const activeTasks = tasks.filter((t) => t.status === 'active');
  const grouped = groupTasksByPriority(activeTasks);

  const deadlineTasks = activeTasks.filter((t) => t.dueDate && t.dueTime);
  const deadlinesByDay = weekDays
    .map((day) => ({
      date: day,
      tasks: deadlineTasks.filter(
        (t) => t.dueDate && isSameDay(t.dueDate.toDate(), day)
      ),
    }))
    .filter((d) => d.tasks.length > 0);

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
          aria-selected={subView === 'calendar'}
          className={`week-view-toggle-btn ${subView === 'calendar' ? 'week-view-toggle-btn--active' : ''}`}
          onClick={() => setSubView('calendar')}
        >
          Calendar
        </button>
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

      {/* Skeleton loading */}
      {loading && <TaskListSkeleton rows={4} />}

      {/* Calendar Sub-View */}
      {!loading && subView === 'calendar' && (
        <div role="tabpanel">
          {/* Shown on tablet+ */}
          <WeeklyCalendarGrid
            weekDays={weekDays}
            tasks={tasks}
            categories={categories}
            onTaskClick={setSelectedTask}
            onReschedule={handleCalendarReschedule}
          />

          {/* Shown on mobile */}
          <div className="calendar-grid-mobile-note">
            <p>Calendar view works best on a larger screen.</p>
            <p>Switch to <strong>List</strong> or <strong>Deadlines</strong> for mobile.</p>
          </div>
        </div>
      )}

      {/* List Sub-View */}
      {!loading && subView === 'list' && (
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
              <div className="week-view-empty-icon" aria-hidden="true">🌊</div>
              <p>No tasks this week yet.</p>
              <p className="week-view-empty-sub">Plan ahead — or enjoy the break!</p>
              <button
                className="week-view-empty-cta"
                onClick={() => setShowCreateForm(true)}
              >
                + Add a task
              </button>
            </div>
          )}
        </div>
      )}

      {/* Deadlines Sub-View */}
      {!loading && subView === 'deadlines' && (
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
              <div className="week-view-empty-icon" aria-hidden="true">✨</div>
              <p>No deadlines this week.</p>
              <p className="week-view-empty-sub">Looking manageable!</p>
            </div>
          )}
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
          initialData={{}}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      </BottomSheet>

      {/* Task Detail */}
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
