import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Scheduled function that runs every minute to check for due reminders
 * and send push notifications via FCM.
 */
export const processReminders = onSchedule('every 1 minutes', async () => {
  const now = admin.firestore.Timestamp.now();

  // Query all users' reminders subcollections using collectionGroup
  const remindersQuery = db
    .collectionGroup('reminders')
    .where('status', '==', 'scheduled')
    .where('scheduledAt', '<=', now)
    .limit(500);

  const snapshot = await remindersQuery.get();

  if (snapshot.empty) {
    logger.info('No due reminders found');
    return;
  }

  logger.info(`Processing ${snapshot.size} due reminders`);

  const batch = db.batch();
  const notifications: Promise<string>[] = [];

  for (const reminderDoc of snapshot.docs) {
    const reminder = reminderDoc.data();
    const userId = reminderDoc.ref.parent.parent?.id;

    if (!userId) continue;

    // Mark as sent
    batch.update(reminderDoc.ref, {
      status: 'sent',
      sentAt: admin.firestore.Timestamp.now(),
    });

    // Get user's FCM token
    try {
      const settingsDoc = await db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('preferences')
        .get();

      const settings = settingsDoc.data();
      const fcmToken = settings?.fcmToken;

      if (fcmToken && settings?.pushNotificationsEnabled) {
        const message: admin.messaging.Message = {
          token: fcmToken,
          data: {
            title: 'ClearMind Reminder',
            body: reminder.taskName || 'You have a task reminder',
            taskId: reminder.taskId || '',
          },
          webpush: {
            notification: {
              title: 'ClearMind Reminder',
              body: reminder.taskName || 'You have a task reminder',
              icon: '/logo192.png',
              badge: '/logo192.png',
              requireInteraction: true,
              tag: reminder.taskId || 'clearmind-reminder',
            },
            fcmOptions: {
              link: '/',
            },
          },
        };

        notifications.push(
          messaging.send(message).catch((error: Error) => {
            logger.error(
              `Failed to send notification to user ${userId}:`,
              error
            );
            return '';
          })
        );
      }
    } catch (error) {
      logger.error(
        `Error fetching settings for user ${userId}:`,
        error
      );
    }
  }

  // Commit all status updates
  await batch.commit();

  // Wait for all notifications to be sent
  const results = await Promise.all(notifications);
  const sentCount = results.filter((r) => r !== '').length;

  logger.info(
    `Processed ${snapshot.size} reminders, sent ${sentCount} push notifications`
  );
});

/**
 * Cleanup function that runs daily to remove old dismissed/cancelled reminders.
 * Keeps the reminders collection clean.
 */
export const cleanupReminders = onSchedule(
  { schedule: 'every day 03:00', timeZone: 'America/New_York' },
  async () => {
    const sevenDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const oldReminders = await db
      .collectionGroup('reminders')
      .where('status', 'in', ['dismissed', 'cancelled'])
      .where('createdAt', '<', sevenDaysAgo)
      .limit(500)
      .get();

    if (oldReminders.empty) {
      logger.info('No old reminders to clean up');
      return;
    }

    const batch = db.batch();
    for (const reminderDoc of oldReminders.docs) {
      batch.delete(reminderDoc.ref);
    }

    await batch.commit();
    logger.info(`Cleaned up ${oldReminders.size} old reminders`);
  }
);
