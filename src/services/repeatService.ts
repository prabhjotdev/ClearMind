import {
  collection,
  doc as firestoreDoc,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Task, RepeatMode } from '../types';
import {
  addDays,
  addMonths,
  startOfDay,
  endOfMonth,
  isAfter,
} from 'date-fns';

const ROLLING_WINDOW_DAYS = 30;

function tasksCollection(userId: string) {
  return collection(db, 'users', userId, 'tasks');
}

/**
 * Clamp day to the last valid day of the target month.
 * E.g., day=31 in February → 28 (or 29 in leap year).
 */
function getMonthlyDate(originalDay: number, targetDate: Date): Date {
  const lastDayOfMonth = endOfMonth(targetDate).getDate();
  const day = Math.min(originalDay, lastDayOfMonth);
  return new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
}

/**
 * Get the next occurrence date for the given repeat mode.
 */
function getNextDate(currentDate: Date, repeat: RepeatMode, originalDay?: number): Date {
  switch (repeat) {
    case 'daily':
      return addDays(currentDate, 1);
    case 'weekly':
      return addDays(currentDate, 7);
    case 'monthly': {
      const nextMonth = addMonths(currentDate, 1);
      if (originalDay !== undefined) {
        return getMonthlyDate(originalDay, nextMonth);
      }
      return nextMonth;
    }
    default:
      return currentDate;
  }
}

/**
 * Generate repeat instances for a task for the next `windowDays` days.
 * Runs client-side as a replacement for Cloud Functions on the free plan.
 */
export async function generateRepeatInstances(
  userId: string,
  task: Task,
  windowDays: number = ROLLING_WINDOW_DAYS
): Promise<number> {
  if (task.repeat === 'none' || !task.dueDate) return 0;

  const seriesId = task.repeatSeriesId || task.id;
  const now = new Date();
  const windowEnd = addDays(now, windowDays);
  const taskDueDate = task.dueDate.toDate();
  const originalDay = taskDueDate.getDate();

  // Get existing instances for this series
  const existingQuery = query(
    tasksCollection(userId),
    where('repeatSeriesId', '==', seriesId),
    where('status', 'in', ['active', 'completed']),
    orderBy('dueDate', 'asc')
  );

  const existingSnap = await getDocs(existingQuery);
  const existingDates = new Set(
    existingSnap.docs.map((d) => {
      const data = d.data();
      return data.dueDate ? startOfDay(data.dueDate.toDate()).getTime() : 0;
    })
  );

  // Determine start date for generation
  let currentDate: Date;
  if (isAfter(now, taskDueDate)) {
    currentDate = startOfDay(addDays(now, 1));
  } else {
    currentDate = startOfDay(getNextDate(taskDueDate, task.repeat, originalDay));
  }

  let count = 0;

  while (!isAfter(currentDate, windowEnd) && count < 100) {
    const dateKey = startOfDay(currentDate).getTime();

    if (!existingDates.has(dateKey)) {
      await addDoc(tasksCollection(userId), {
        name: task.name,
        description: task.description,
        priority: task.priority,
        categoryId: task.categoryId,
        dueDate: Timestamp.fromDate(startOfDay(currentDate)),
        dueTime: task.dueTime,
        repeat: task.repeat,
        repeatSeriesId: seriesId,
        repeatOriginalDate: Timestamp.fromDate(startOfDay(currentDate)),
        status: 'active',
        completedAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
      });
      count++;
      existingDates.add(dateKey); // Prevent duplicates within this run
    }

    currentDate = getNextDate(currentDate, task.repeat, originalDay);
  }

  return count;
}

/**
 * Fill the rolling window for ALL repeat series belonging to the user.
 * Called on app launch to ensure the window is always filled.
 */
export async function fillRepeatWindowForUser(userId: string): Promise<number> {
  const q = query(
    tasksCollection(userId),
    where('repeat', 'in', ['daily', 'weekly', 'monthly']),
    where('status', 'in', ['active', 'completed'])
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  // Deduplicate by seriesId — only process one task per series
  const seriesSeen = new Set<string>();
  const sourceTasks: Task[] = [];

  for (const d of snapshot.docs) {
    const task = { id: d.id, ...d.data() } as Task;
    const sid = task.repeatSeriesId || task.id;
    if (seriesSeen.has(sid)) continue;
    seriesSeen.add(sid);
    sourceTasks.push(task);
  }

  let totalCreated = 0;
  for (const task of sourceTasks) {
    const created = await generateRepeatInstances(userId, task);
    totalCreated += created;
  }

  return totalCreated;
}

/**
 * Update all future instances of a repeat series.
 * Used when user chooses "Edit all future" on a repeat task.
 */
export async function updateFutureInstances(
  userId: string,
  seriesId: string,
  updates: Partial<{
    name: string;
    description: string;
    priority: string;
    categoryId: string;
    dueTime: string | null;
  }>
): Promise<number> {
  const todayStart = Timestamp.fromDate(startOfDay(new Date()));

  const q = query(
    tasksCollection(userId),
    where('repeatSeriesId', '==', seriesId),
    where('status', '==', 'active'),
    where('dueDate', '>=', todayStart),
    orderBy('dueDate', 'asc')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  const now = Timestamp.now();

  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { ...updates, updatedAt: now });
  });

  await batch.commit();
  return snapshot.size;
}

/**
 * Stop a repeat series: set current task to non-repeating,
 * soft-delete all future instances.
 */
export async function stopRepeatSeries(
  userId: string,
  taskId: string,
  seriesId: string
): Promise<number> {
  const todayStart = Timestamp.fromDate(startOfDay(new Date()));

  // 1. Set the current task to non-repeating
  const taskRef = firestoreDoc(db, 'users', userId, 'tasks', taskId);
  await updateDoc(taskRef, {
    repeat: 'none',
    updatedAt: Timestamp.now(),
  });

  // 2. Soft-delete all future instances (excluding the current one)
  const q = query(
    tasksCollection(userId),
    where('repeatSeriesId', '==', seriesId),
    where('status', '==', 'active'),
    where('dueDate', '>', todayStart),
    orderBy('dueDate', 'asc')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  const now = Timestamp.now();
  let deleted = 0;

  snapshot.docs.forEach((docSnap) => {
    if (docSnap.id !== taskId) {
      batch.update(docSnap.ref, { status: 'deleted', updatedAt: now });
      deleted++;
    }
  });

  if (deleted > 0) {
    await batch.commit();
  }

  return deleted;
}
