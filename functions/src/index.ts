import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Scheduled function that runs every minute to check for due reminders
 * and send push notifications via FCM.
 *
 * Schedule: every 1 minute
 * Region: us-central1 (default)
 */
export const processReminders = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    // Query all users' reminders subcollections using collectionGroup
    const remindersQuery = db
      .collectionGroup('reminders')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .limit(500); // Process in batches

    const snapshot = await remindersQuery.get();

    if (snapshot.empty) {
      functions.logger.info('No due reminders found');
      return null;
    }

    functions.logger.info(`Processing ${snapshot.size} due reminders`);

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
              functions.logger.error(
                `Failed to send notification to user ${userId}:`,
                error
              );
              return '';
            })
          );
        }
      } catch (error) {
        functions.logger.error(
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

    functions.logger.info(
      `Processed ${snapshot.size} reminders, sent ${sentCount} push notifications`
    );

    return null;
  });

/**
 * Cleanup function that runs daily to remove old dismissed/cancelled reminders.
 * Keeps the reminders collection clean.
 *
 * Schedule: every day at 3:00 AM
 */
export const cleanupReminders = functions.pubsub
  .schedule('every day 03:00')
  .timeZone('America/New_York')
  .onRun(async () => {
    // Delete reminders that are dismissed/cancelled and older than 7 days
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
      functions.logger.info('No old reminders to clean up');
      return null;
    }

    const batch = db.batch();
    oldReminders.docs.forEach((reminderDoc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.delete(reminderDoc.ref);
    });

    await batch.commit();
    functions.logger.info(`Cleaned up ${oldReminders.size} old reminders`);

    return null;
  });
