import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Task, TaskFormData, Priority } from '../types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

function tasksCollection(userId: string) {
  return collection(db, 'users', userId, 'tasks');
}

function taskDoc(userId: string, taskId: string) {
  return doc(db, 'users', userId, 'tasks', taskId);
}

export async function createTask(
  userId: string,
  formData: TaskFormData
): Promise<string> {
  const now = Timestamp.now();
  const taskData: Omit<Task, 'id'> = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    priority: formData.priority,
    categoryId: formData.categoryId,
    dueDate: formData.dueDate ? Timestamp.fromDate(startOfDay(formData.dueDate)) : null,
    dueTime: formData.dueTime,
    repeat: formData.repeat,
    repeatSeriesId: null,
    repeatOriginalDate: formData.dueDate
      ? Timestamp.fromDate(startOfDay(formData.dueDate))
      : null,
    status: 'active',
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };

  const docRef = await addDoc(tasksCollection(userId), taskData);

  // If repeating, set repeatSeriesId to its own id
  if (formData.repeat !== 'none') {
    await updateDoc(docRef, { repeatSeriesId: docRef.id });
  }

  return docRef.id;
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<TaskFormData & { status: Task['status']; completedAt: Timestamp | null }>
): Promise<void> {
  const updateData: Record<string, any> = {
    updatedAt: Timestamp.now(),
  };

  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.description !== undefined) updateData.description = updates.description.trim();
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;
  if (updates.dueDate !== undefined) {
    updateData.dueDate = updates.dueDate
      ? Timestamp.fromDate(startOfDay(updates.dueDate))
      : null;
  }
  if (updates.dueTime !== undefined) updateData.dueTime = updates.dueTime;
  if (updates.repeat !== undefined) updateData.repeat = updates.repeat;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt;

  await updateDoc(taskDoc(userId, taskId), updateData);
}

export async function completeTask(userId: string, taskId: string): Promise<void> {
  await updateDoc(taskDoc(userId, taskId), {
    status: 'completed',
    completedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function uncompleteTask(userId: string, taskId: string): Promise<void> {
  await updateDoc(taskDoc(userId, taskId), {
    status: 'active',
    completedAt: null,
    updatedAt: Timestamp.now(),
  });
}

export async function softDeleteTask(userId: string, taskId: string): Promise<void> {
  await updateDoc(taskDoc(userId, taskId), {
    status: 'deleted',
    updatedAt: Timestamp.now(),
  });
}

export async function restoreTask(userId: string, taskId: string): Promise<void> {
  await updateDoc(taskDoc(userId, taskId), {
    status: 'active',
    updatedAt: Timestamp.now(),
  });
}

export async function rescheduleTask(
  userId: string,
  taskId: string,
  newDate: Date
): Promise<void> {
  await updateDoc(taskDoc(userId, taskId), {
    dueDate: Timestamp.fromDate(startOfDay(newDate)),
    updatedAt: Timestamp.now(),
  });
}

export async function rescheduleTaskWithTime(
  userId: string,
  taskId: string,
  newDate: Date,
  newTime: string | null
): Promise<void> {
  await updateDoc(taskDoc(userId, taskId), {
    dueDate: Timestamp.fromDate(startOfDay(newDate)),
    dueTime: newTime,
    updatedAt: Timestamp.now(),
  });
}

export async function rescheduleOverdueTasks(
  userId: string,
  taskIds: string[],
  newDate: Date
): Promise<void> {
  const batch = writeBatch(db);
  const dateTimestamp = Timestamp.fromDate(startOfDay(newDate));
  const now = Timestamp.now();

  taskIds.forEach((taskId) => {
    batch.update(taskDoc(userId, taskId), {
      dueDate: dateTimestamp,
      updatedAt: now,
    });
  });

  await batch.commit();
}

// ─── Real-time listeners ─────────────────────────────────────

export function subscribeToTasksForDate(
  userId: string,
  date: Date,
  callback: (tasks: Task[]) => void
): () => void {
  const dayStart = Timestamp.fromDate(startOfDay(date));
  const dayEnd = Timestamp.fromDate(endOfDay(date));

  const q = query(
    tasksCollection(userId),
    where('status', 'in', ['active', 'completed']),
    where('dueDate', '>=', dayStart),
    where('dueDate', '<=', dayEnd),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    callback(tasks);
  });
}

export function subscribeToTasksForWeek(
  userId: string,
  date: Date,
  weekStartsOn: 0 | 1,
  callback: (tasks: Task[]) => void
): () => void {
  const weekStart = Timestamp.fromDate(
    startOfWeek(date, { weekStartsOn })
  );
  const weekEnd = Timestamp.fromDate(
    endOfWeek(date, { weekStartsOn })
  );

  const q = query(
    tasksCollection(userId),
    where('status', 'in', ['active', 'completed']),
    where('dueDate', '>=', weekStart),
    where('dueDate', '<=', weekEnd),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    callback(tasks);
  });
}

export function subscribeToTasksForMonth(
  userId: string,
  date: Date,
  callback: (tasks: Task[]) => void
): () => void {
  const monthStart = Timestamp.fromDate(startOfMonth(date));
  const monthEnd = Timestamp.fromDate(endOfMonth(date));

  const q = query(
    tasksCollection(userId),
    where('status', 'in', ['active', 'completed']),
    where('dueDate', '>=', monthStart),
    where('dueDate', '<=', monthEnd),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    callback(tasks);
  });
}

export function subscribeToOverdueTasks(
  userId: string,
  callback: (tasks: Task[]) => void
): () => void {
  const todayStart = Timestamp.fromDate(startOfDay(new Date()));

  const q = query(
    tasksCollection(userId),
    where('status', '==', 'active'),
    where('dueDate', '<', todayStart),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    callback(tasks);
  });
}

// ─── Helpers ─────────────────────────────────────────────────

export function sortTasksByPriority(tasks: Task[]): Task[] {
  const order: Record<Priority, number> = { P1: 0, P2: 1, P3: 2 };
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
}

export function groupTasksByPriority(tasks: Task[]): Record<Priority, Task[]> {
  const groups: Record<Priority, Task[]> = { P1: [], P2: [], P3: [] };
  tasks.forEach((task) => {
    groups[task.priority].push(task);
  });
  return groups;
}

// ─── Export / Delete ──────────────────────────────────────────

export async function getAllTasksForExport(
  userId: string,
  scope: 'all' | 'active'
): Promise<Task[]> {
  const statusFilter =
    scope === 'active' ? ['active'] : ['active', 'completed'];

  const q = query(
    tasksCollection(userId),
    where('status', 'in', statusFilter),
    orderBy('createdAt', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Task[];
}

export async function deleteAllTasks(userId: string): Promise<void> {
  const snapshot = await getDocs(tasksCollection(userId));
  if (snapshot.empty) return;

  // Firestore batch limit is 500 operations
  const BATCH_SIZE = 500;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
