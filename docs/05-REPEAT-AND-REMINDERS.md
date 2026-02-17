# ClearMind — Repeat Tasks & Reminders Logic

## Part 1: Repeat Tasks

### Repeat Modes

| Mode | Meaning | Example |
|---|---|---|
| `none` | One-time task | "Submit tax docs" — happens once |
| `daily` | Recurs every day | "Take medication" — every day at 9 AM |
| `weekly` | Recurs same day each week | "Team standup" — every Monday at 10 AM |
| `monthly` | Recurs same date each month | "Pay rent" — 1st of every month |

### Instance Generation Strategy

**Approach: Generate-Ahead (Rolling Window)**

Rather than generating all future instances upfront (infinite) or generating on-the-fly (complex queries), ClearMind uses a **rolling window** approach:

1. When a repeating task is created, generate instances for the **next 30 days**.
2. A daily Cloud Function runs at midnight (UTC) and generates any missing instances for the next 30 days.
3. Each instance is a **full Task document** with its own `id`, but shares the `repeatSeriesId`.

**Why this approach?**
- Queries stay simple: just query tasks by `dueDate` range like any other task.
- Offline works naturally: instances exist as real documents.
- No on-the-fly calculation needed in the client.
- 30-day window keeps document count manageable.

### Instance Generation Rules

```typescript
function generateRepeatInstances(
  task: Task,
  fromDate: Date,
  windowDays: number = 30
): Task[] {
  const instances: Task[] = [];
  let currentDate = new Date(fromDate);
  const endDate = addDays(fromDate, windowDays);

  while (currentDate <= endDate) {
    // Skip the original task's date (it already exists)
    if (!isSameDay(currentDate, task.dueDate)) {
      instances.push({
        ...task,
        id: generateId(),             // New unique ID
        dueDate: currentDate,         // New date
        dueTime: task.dueTime,        // Same time
        repeatSeriesId: task.repeatSeriesId, // Same series
        repeatOriginalDate: currentDate,     // Track intended date
        status: 'active',
        completedAt: null,
        createdAt: now(),
        updatedAt: now(),
      });
    }

    // Advance to next occurrence
    switch (task.repeat) {
      case 'daily':
        currentDate = addDays(currentDate, 1);
        break;
      case 'weekly':
        currentDate = addDays(currentDate, 7);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
    }
  }

  return instances;
}
```

### Edge Cases: Repeat Tasks

#### 1. Monthly repeat on the 31st
**Problem**: Not all months have 31 days.
**Rule**: If the target date doesn't exist in the month, use the last day of that month.
- "Pay rent on 31st" → Jan 31, Feb 28 (or 29), Mar 31, Apr 30, May 31, ...

```typescript
function getMonthlyDate(originalDay: number, targetMonth: Date): Date {
  const lastDayOfMonth = endOfMonth(targetMonth).getDate();
  const day = Math.min(originalDay, lastDayOfMonth);
  return setDate(targetMonth, day);
}
```

#### 2. Completing one instance of a repeating task
**Behavior**: Only that instance is marked `completed`. Other instances are unaffected.
- Each instance is its own document, so this is naturally handled.

#### 3. Deleting one instance of a repeating task
**Behavior**: Only that instance is soft-deleted. A toast shows: "Deleted this occurrence. [Undo]"

#### 4. Editing a single instance
**Behavior**: The edited instance becomes "detached" — its fields change but it keeps the same `repeatSeriesId`.
- The user sees: "Edit this task only?" [Yes] [Edit all future]

#### 5. Editing all future instances
**Behavior**:
1. Query all tasks where `repeatSeriesId == X AND dueDate >= today AND status == 'active'`.
2. Batch update the changed fields (name, priority, time, etc.) on all results.
3. Re-generate instances if the repeat pattern changed (e.g., daily → weekly).

#### 6. Stopping a repeat series
**Behavior**:
1. Set `repeat: 'none'` on the current instance.
2. Soft-delete all future instances (`status: 'deleted'`).
3. Toast: "Repeat stopped. Future tasks removed. [Undo]"

#### 7. Timezone change (user travels)
**Problem**: User creates "Take medication daily at 9 AM" in EST, then flies to PST.
**Rule**:
- `dueTime` is stored as the user's **intended local time** (string "09:00"), not a UTC timestamp.
- The app reads the user's current timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone` and from the `users/{userId}.timezone` field.
- If the detected timezone differs from the stored one, show a one-time prompt: "It looks like you're in a new timezone (PST). Should we adjust your task times?"
  - "Yes, adjust": Update `timezone` in profile. Reminder times recalculate.
  - "No, keep original times": Tasks stay at the original timezone's time.

#### 8. Instance generation gap (user offline for 35+ days)
**Problem**: The rolling window is 30 days. If a user is offline for 35 days, there may be a gap.
**Rule**: On app launch, check if any repeat series has instances covering the next 30 days. If not, trigger generation client-side. This runs as a background task after auth.

---

## Part 2: Reminders

### Reminder Types

| Type | Channel | Requires |
|---|---|---|
| Push notification | OS notification via FCM | Notification permission granted |
| In-app notification | Badge + notification panel | App must be open |
| Both | Push + In-app | Both conditions |

### Reminder Offsets

| Offset | `offsetMinutes` Value | Label |
|---|---|---|
| At time of task | 0 | "At time of task" |
| 5 minutes before | 5 | "5 minutes before" |
| 15 minutes before | 15 | "15 minutes before" |
| 30 minutes before | 30 | "30 minutes before" |
| 1 hour before | 60 | "1 hour before" |
| 1 day before | 1440 | "1 day before" |
| Custom | user-defined | "Custom" |

### Reminder Scheduling

When a task with reminders is created or updated:

```typescript
async function scheduleReminders(task: Task, offsets: number[]): Promise<void> {
  // 1. Cancel any existing reminders for this task
  await cancelRemindersForTask(task.id);

  // 2. Skip if no due date/time
  if (!task.dueDate || !task.dueTime) return;

  // 3. Calculate exact fire times
  const taskDateTime = combineDateAndTime(
    task.dueDate,
    task.dueTime,
    userTimezone
  );

  for (const offsetMinutes of offsets) {
    const scheduledAt = subMinutes(taskDateTime, offsetMinutes);

    // Don't schedule reminders in the past
    if (scheduledAt <= new Date()) continue;

    await createReminder({
      taskId: task.id,
      taskName: task.name,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      offsetMinutes,
      status: 'scheduled',
      type: getUserNotificationPreference(), // 'push' | 'in_app' | 'both'
      snoozedUntil: null,
      snoozeCount: 0,
      sentAt: null,
      createdAt: Timestamp.now(),
    });
  }
}
```

### Reminder Delivery (Cloud Function)

A Cloud Function runs every minute via Cloud Scheduler:

```typescript
// Pseudocode for the Cloud Function
exports.processReminders = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = Timestamp.now();

    // Query all users' reminders that are due
    // Note: This requires a collection group query
    const dueReminders = await db
      .collectionGroup('reminders')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .limit(500) // Process in batches
      .get();

    for (const doc of dueReminders.docs) {
      const reminder = doc.data();
      const userId = doc.ref.parent.parent.id;

      // Get user's FCM token
      const settings = await getUserSettings(userId);

      if (reminder.type === 'push' || reminder.type === 'both') {
        if (settings.fcmToken && settings.pushNotificationsEnabled) {
          await sendPushNotification(settings.fcmToken, {
            title: 'ClearMind',
            body: formatReminderBody(reminder),
            data: { taskId: reminder.taskId },
          });
        }
      }

      // Mark as sent
      await doc.ref.update({
        status: 'sent',
        sentAt: Timestamp.now(),
      });
    }
  });
```

### Snooze Logic

```typescript
async function snoozeReminder(
  reminderId: string,
  snoozeDuration: 'fifteen_min' | 'one_hour' | 'tomorrow'
): Promise<void> {
  const reminder = await getReminder(reminderId);

  if (reminder.snoozeCount >= 5) {
    // Max snoozes reached — show message:
    // "You've snoozed this 5 times. Would you like to reschedule the task instead?"
    return;
  }

  let snoozedUntil: Date;
  switch (snoozeDuration) {
    case 'fifteen_min':
      snoozedUntil = addMinutes(new Date(), 15);
      break;
    case 'one_hour':
      snoozedUntil = addHours(new Date(), 1);
      break;
    case 'tomorrow':
      snoozedUntil = setHours(addDays(startOfDay(new Date()), 1), 9, 0); // Tomorrow at 9 AM
      break;
  }

  await updateReminder(reminderId, {
    status: 'scheduled',        // Back to scheduled so it fires again
    scheduledAt: Timestamp.fromDate(snoozedUntil),
    snoozedUntil: Timestamp.fromDate(snoozedUntil),
    snoozeCount: reminder.snoozeCount + 1,
  });
}
```

### Edge Cases: Reminders

#### 1. Task completed before reminder fires
**Rule**: When a task is completed, cancel all its pending reminders:
```typescript
async function completeTask(taskId: string): Promise<void> {
  await updateTask(taskId, { status: 'completed', completedAt: Timestamp.now() });
  await cancelRemindersForTask(taskId); // Set status to 'cancelled'
}
```

#### 2. Task deleted before reminder fires
**Rule**: Same as completion — cancel all pending reminders for the task.

#### 3. Missed reminder (Cloud Function was delayed)
**Problem**: Cloud Function runs every minute but may have cold start delays.
**Rule**: The query uses `scheduledAt <= now`, so delayed reminders still get picked up on the next run. At most a 1-2 minute delay, which is acceptable for a task app.

#### 4. User revokes notification permission
**Rule**:
- On app launch, check `Notification.permission`.
- If `'denied'`, update settings: `pushNotificationsEnabled: false`.
- Show a non-blocking banner: "Push notifications are disabled. Enable them in your browser settings for reminders."
- In-app notifications still work regardless.

#### 5. Reminders for repeat task instances
**Rule**: When a repeat instance is generated, its reminders are also generated using the same offsets as the original task. The `scheduleReminders` function is called for each new instance.

#### 6. User changes timezone — existing reminders
**Rule**: When timezone changes and user confirms adjustment:
1. Query all `scheduled` reminders for the user.
2. Recalculate `scheduledAt` based on the new timezone and the original task's `dueTime`.
3. Batch update all affected reminders.

#### 7. Multiple reminders fire at the same time
**Rule**: Each reminder is an independent document and notification. If "15 min before" and "at time of task" happen to coincide (task created 10 minutes before its due time), both fire. The push notification deduplication is handled by grouping: use the `taskId` as the notification tag so the OS collapses them into one.

#### 8. Daily digest notification
**Rule**: A separate Cloud Function runs at each user's configured `dailyDigestTime`:
1. Query: users where `dailyDigestEnabled == true`.
2. For each user, query today's active tasks.
3. Send a single push notification: "Good morning! You have {count} tasks today. Top priority: {P1 task name}."

Implementation: Since users have different digest times, batch users by hour and run 24 Cloud Functions (one per hour) OR use a single function that queries users whose digest time falls in the current hour.

---

## Reminder Notification Content

### Push Notification Templates

| Scenario | Title | Body |
|---|---|---|
| Before task | ClearMind | "{task name}" is coming up in {offset} |
| At task time | ClearMind | Time for "{task name}" |
| Overdue | ClearMind | "{task name}" was due at {time}. Still on your list. |
| Daily digest | Good morning! | You have {count} tasks today. Top priority: "{name}" |
| Snoozed re-fire | ClearMind | Reminder: "{task name}" (snoozed from {original time}) |

### Push Notification Actions (Android/Desktop)

```json
{
  "actions": [
    { "action": "complete", "title": "Done" },
    { "action": "snooze", "title": "Snooze 15m" }
  ]
}
```

These are handled by the service worker's `notificationclick` event.
