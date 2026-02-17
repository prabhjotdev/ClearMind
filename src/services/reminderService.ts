import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Reminder, ReminderOffset, ReminderStatus } from '../types';
import { subMinutes } from 'date-fns';

function remindersCollection(userId: string) {
  return collection(db, 'users', userId, 'reminders');
}

function reminderDoc(userId: string, reminderId: string) {
  return doc(db, 'users', userId, 'reminders', reminderId);
}

// ─── Scheduling ──────────────────────────────────────────────

/**
 * Schedule reminders for a task. Cancels any existing reminders first.
 * Requires the task to have both dueDate and dueTime.
 */
export async function scheduleRemindersForTask(
  userId: string,
  taskId: string,
  taskName: string,
  dueDate: Date,
  dueTime: string, // "HH:mm"
  offsets: ReminderOffset[]
): Promise<void> {
  // Cancel existing reminders for this task first
  await cancelRemindersForTask(userId, taskId);

  if (offsets.length === 0) return;

  // Build the full datetime from date + time in local timezone
  const [hours, minutes] = dueTime.split(':').map(Number);
  const taskDateTime = new Date(dueDate);
  taskDateTime.setHours(hours, minutes, 0, 0);

  const batch = writeBatch(db);

  for (const offset of offsets) {
    const scheduledAt = subMinutes(taskDateTime, offset.offsetMinutes);

    // Don't schedule reminders in the past
    if (scheduledAt <= new Date()) continue;

    const reminderRef = doc(remindersCollection(userId));
    batch.set(reminderRef, {
      taskId,
      taskName,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      offsetMinutes: offset.offsetMinutes,
      status: 'scheduled' as ReminderStatus,
      snoozedUntil: null,
      snoozeCount: 0,
      type: offset.type,
      sentAt: null,
      createdAt: Timestamp.now(),
    });
  }

  await batch.commit();
}

// ─── Cancel ──────────────────────────────────────────────────

/**
 * Cancel all pending/scheduled reminders for a task.
 * Called when a task is completed or deleted.
 */
export async function cancelRemindersForTask(
  userId: string,
  taskId: string
): Promise<void> {
  const q = query(
    remindersCollection(userId),
    where('taskId', '==', taskId),
    where('status', 'in', ['scheduled', 'snoozed'])
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { status: 'cancelled' as ReminderStatus });
  });

  await batch.commit();
}

// ─── Snooze ──────────────────────────────────────────────────

export type SnoozeDuration = 'fifteen_min' | 'one_hour' | 'tomorrow';

export async function snoozeReminder(
  userId: string,
  reminderId: string,
  duration: SnoozeDuration
): Promise<{ success: boolean; maxReached?: boolean }> {
  const docRef = reminderDoc(userId, reminderId);

  // Read current snooze count — we fetch all reminders in the panel anyway,
  // so we pass reminder data from caller. But for safety, check snoozeCount.
  // Caller should check snoozeCount < 5 before calling.

  let snoozedUntil: Date;
  const now = new Date();

  switch (duration) {
    case 'fifteen_min':
      snoozedUntil = new Date(now.getTime() + 15 * 60 * 1000);
      break;
    case 'one_hour':
      snoozedUntil = new Date(now.getTime() + 60 * 60 * 1000);
      break;
    case 'tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      snoozedUntil = tomorrow;
      break;
    }
  }

  await updateDoc(docRef, {
    status: 'scheduled' as ReminderStatus, // Back to scheduled so it fires again
    scheduledAt: Timestamp.fromDate(snoozedUntil),
    snoozedUntil: Timestamp.fromDate(snoozedUntil),
  });

  // Increment snoozeCount — use a transaction-safe approach
  // For simplicity in MVP, we do a direct update
  // The caller passes current snoozeCount
  return { success: true };
}

export async function incrementSnoozeCount(
  userId: string,
  reminderId: string,
  currentCount: number
): Promise<void> {
  await updateDoc(reminderDoc(userId, reminderId), {
    snoozeCount: currentCount + 1,
  });
}

export async function dismissReminder(
  userId: string,
  reminderId: string
): Promise<void> {
  await updateDoc(reminderDoc(userId, reminderId), {
    status: 'dismissed' as ReminderStatus,
  });
}

// ─── Queries ─────────────────────────────────────────────────

/**
 * Get all reminders for a specific task.
 */
export function subscribeToRemindersForTask(
  userId: string,
  taskId: string,
  callback: (reminders: Reminder[]) => void
): () => void {
  const q = query(
    remindersCollection(userId),
    where('taskId', '==', taskId),
    orderBy('scheduledAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const reminders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reminder[];
    callback(reminders);
  });
}

/**
 * Subscribe to all active (scheduled/snoozed/sent) reminders for the user.
 * Used for the in-app notification panel.
 */
export function subscribeToActiveReminders(
  userId: string,
  callback: (reminders: Reminder[]) => void
): () => void {
  const q = query(
    remindersCollection(userId),
    where('status', 'in', ['scheduled', 'snoozed', 'sent']),
    orderBy('scheduledAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const reminders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reminder[];
    callback(reminders);
  });
}

/**
 * Get reminders that are due (scheduledAt <= now and still scheduled).
 * Used by the in-app reminder checker.
 */
export function subscribeToDueReminders(
  userId: string,
  callback: (reminders: Reminder[]) => void
): () => void {
  const now = Timestamp.now();

  const q = query(
    remindersCollection(userId),
    where('status', '==', 'scheduled'),
    where('scheduledAt', '<=', now),
    orderBy('scheduledAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const reminders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reminder[];
    callback(reminders);
  });
}

/**
 * Mark a reminder as sent (used by the in-app notification checker).
 */
export async function markReminderSent(
  userId: string,
  reminderId: string
): Promise<void> {
  await updateDoc(reminderDoc(userId, reminderId), {
    status: 'sent' as ReminderStatus,
    sentAt: Timestamp.now(),
  });
}

// ─── Helpers ─────────────────────────────────────────────────

export const REMINDER_OFFSET_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'At time of task' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export function formatReminderOffset(offsetMinutes: number): string {
  const option = REMINDER_OFFSET_OPTIONS.find((o) => o.value === offsetMinutes);
  if (option) return option.label;

  if (offsetMinutes < 60) return `${offsetMinutes}m before`;
  if (offsetMinutes < 1440) return `${offsetMinutes / 60}h before`;
  return `${offsetMinutes / 1440}d before`;
}
