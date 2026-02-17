import { useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { markReminderSent } from '../services/reminderService';
import { showLocalNotification } from '../services/notificationService';
import { Reminder } from '../types';

const CHECK_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Hook that periodically checks for due reminders and fires local notifications.
 * This runs client-side as a fallback for when Cloud Functions aren't deployed.
 */
export function useReminderChecker(userId: string | undefined) {
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    async function checkDueReminders() {
      try {
        const now = Timestamp.now();
        const remindersRef = collection(db, 'users', userId!, 'reminders');
        const q = query(
          remindersRef,
          where('status', '==', 'scheduled'),
          where('scheduledAt', '<=', now),
          orderBy('scheduledAt', 'asc')
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        for (const doc of snapshot.docs) {
          const reminder = { id: doc.id, ...doc.data() } as Reminder;

          // Skip already-processed in this session
          if (processedRef.current.has(reminder.id)) continue;
          processedRef.current.add(reminder.id);

          // Fire local notification
          showLocalNotification(
            'ClearMind Reminder',
            reminder.taskName,
            reminder.taskId
          );

          // Mark as sent in Firestore
          await markReminderSent(userId!, reminder.id);
        }
      } catch (error) {
        console.error('Error checking due reminders:', error);
      }
    }

    // Run immediately on mount
    checkDueReminders();

    // Then run periodically
    const interval = setInterval(checkDueReminders, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [userId]);
}
