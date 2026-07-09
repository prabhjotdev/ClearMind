# ClearMind — Firestore Data Model

## Overview

ClearMind uses a **user-scoped** Firestore structure. All data lives under the user's document to simplify security rules and enable efficient queries.

```
firestore-root/
├── users/{userId}/
│   ├── profile (document fields)
│   ├── tasks/{taskId}          ← Individual task documents
│   ├── categories/{categoryId} ← User-defined categories
│   ├── settings (document)     ← User preferences (single doc)
│   ├── reminders/{reminderId}  ← Scheduled reminders
│   ├── gamification/state      ← Companion XP/level + Focus Points (single doc, opt-in)
│   └── pokedex/{speciesId}     ← Discovered Pokemon (one doc per species, opt-in)
```

---

## Collection: `users`

### Document: `users/{userId}`

```typescript
interface UserProfile {
  uid: string;                    // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL: string | null;
  authProvider: 'google' | 'email';
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  onboardingCompleted: boolean;
  timezone: string;               // IANA timezone e.g. "America/New_York"
}
```

**Why `timezone`?** Critical for repeat tasks and reminders. A task due "daily at 9 AM" must resolve to the user's local 9 AM, not UTC 9 AM.

---

## Sub-Collection: `users/{userId}/tasks`

### Document: `tasks/{taskId}`

```typescript
interface Task {
  id: string;                     // Auto-generated Firestore doc ID
  name: string;                   // Required, max 200 chars
  description: string;            // Optional, max 2000 chars
  priority: 'P1' | 'P2' | 'P3';  // Required, default 'P3'
  categoryId: string;             // Reference to categories sub-collection

  // Date & Time
  dueDate: Timestamp | null;      // Date only (time set to 00:00:00 UTC)
  dueTime: string | null;         // "HH:mm" in user's local timezone (e.g., "14:30")
                                  // Stored separately to avoid timezone math on dates

  // Repeat
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
  repeatSeriesId: string | null;  // Groups all instances of a repeat series
  repeatOriginalDate: Timestamp | null; // The original scheduled date for this instance

  // Status
  status: 'active' | 'completed' | 'deleted';
  completedAt: Timestamp | null;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;              // userId (for future sharing)
}
```

### Design Decisions

**Why separate `dueDate` and `dueTime`?**
- `dueDate` stores just the calendar date (as a Timestamp with time zeroed in UTC). This makes date-range queries simple: "get all tasks where dueDate >= Feb 17 AND dueDate < Feb 18".
- `dueTime` stores the local time as a string. This avoids daylight saving time bugs where a Timestamp shifts to a different date when converted to local time.
- Tasks with `dueDate` but no `dueTime` are "all-day" tasks.

**Why `repeatSeriesId`?**
- When a user creates a repeating task, the first instance gets a `repeatSeriesId` equal to its own `id`. Future instances share the same `repeatSeriesId`.
- This allows "edit all future instances" by querying `repeatSeriesId == X AND dueDate >= today`.

**Why soft-delete (`status: 'deleted'`) instead of actual deletion?**
- Enables the 6-second undo window.
- A Cloud Function can permanently delete documents with `status: 'deleted'` older than 30 days.

---

## Sub-Collection: `users/{userId}/categories`

### Document: `categories/{categoryId}`

```typescript
interface Category {
  id: string;
  name: string;                   // e.g., "Work", "Personal", "Health"
  color: string;                  // Hex color for category chip, e.g., "#8B5CF6"
  icon: string;                   // Optional emoji or icon name, e.g., "💼"
  order: number;                  // Display order in chip selector
  isDefault: boolean;             // System-provided categories (Work, Personal, Health)
  createdAt: Timestamp;
}
```

**Default categories** created during onboarding:
| Name | Color | Icon | Order |
|---|---|---|---|
| Work | `#3B82F6` | 💼 | 0 |
| Personal | `#8B5CF6` | 🏠 | 1 |
| Health | `#10B981` | 💪 | 2 |

Users can add custom categories and reorder them.

---

## Document: `users/{userId}/settings`

A single document (not a sub-collection) for user preferences:

```typescript
interface UserSettings {
  // Notifications
  pushNotificationsEnabled: boolean;    // default: true
  inAppNotificationsEnabled: boolean;   // default: true
  dailyDigestEnabled: boolean;          // default: false
  dailyDigestTime: string;              // "HH:mm", default: "08:00"
  reminderSound: 'default' | 'gentle' | 'none';

  // Accessibility
  fontSize: number;                     // Percentage, 85–130, default: 100
  reducedMotion: boolean;               // default: false (also reads OS setting)
  highContrast: boolean;                // default: false
  screenReaderMode: boolean;            // default: false

  // Display
  heatmapThresholdHigh: number;         // default: 5 (red when > this)
  heatmapThresholdMedium: number;       // default: 3 (orange when >= this)
  weekStartsOn: 'monday' | 'sunday';   // default: 'monday'

  // System
  fcmToken: string | null;             // Firebase Cloud Messaging token
  lastSyncAt: Timestamp;

  // Gamification (opt-in)
  gamificationEnabled: boolean;         // default: false
  gamificationBannerDismissed: boolean; // default: false — hides the one-time intro banner
}
```

---

## Sub-Collection: `users/{userId}/reminders`

### Document: `reminders/{reminderId}`

```typescript
interface Reminder {
  id: string;
  taskId: string;                       // Reference to the task
  taskName: string;                     // Denormalized for notification body

  // When to fire
  scheduledAt: Timestamp;               // Exact UTC timestamp to fire
  offsetMinutes: number;                // Original offset: 0, 5, 15, 30, 60, 1440

  // Status
  status: 'scheduled' | 'sent' | 'snoozed' | 'dismissed' | 'cancelled';
  snoozedUntil: Timestamp | null;       // If snoozed, new fire time
  snoozeCount: number;                  // Track how many times snoozed (max 5)

  // Delivery
  type: 'push' | 'in_app' | 'both';    // Delivery channel
  sentAt: Timestamp | null;             // When notification was actually sent

  // Metadata
  createdAt: Timestamp;
}
```

**Why a separate reminders collection?**
- Cloud Functions can query `reminders` where `scheduledAt <= now AND status == 'scheduled'` on a cron schedule.
- Keeps reminder logic decoupled from task documents.
- Allows multiple reminders per task without array manipulation.

---

## Document: `users/{userId}/gamification/state`

A single document (not a sub-collection) holding the opt-in gamification feature's per-user state. See `docs/10-GAMIFICATION.md` for the full feature design.

```typescript
interface GamificationState {
  companionXp: number;              // Lifetime cumulative total, never decreases
  companionLevel: number;           // Derived from companionXp, cached for fast reads
  companionSpeciesId: string;       // Current companion evolution stage
  focusPoints: number;              // Spendable balance (can decrease when spent, never below 0)
  lifetimeFocusPointsEarned: number; // Lifetime total earned, never decreases
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Why no per-task award ledger?** Reversing an award (undo) is only ever triggered from the same 6-second undo-toast closure created at task-completion time — see `src/hooks/useTaskCompletion.ts`. A later, out-of-band "uncomplete" (re-tapping a completed task) does not claw back XP/points. This means no ledger of "which tasks already earned an award" is needed, avoiding unbounded document growth.

**Why is this purely additive?** `docs/01-PRD.md` explicitly excludes streak/loss-based gamification because it can trigger shame spirals for ADHD users. `companionXp` and `lifetimeFocusPointsEarned` never decrease; `focusPoints` only decreases when the user deliberately spends it, never due to inactivity.

---

## Sub-Collection: `users/{userId}/pokedex`

### Document: `pokedex/{speciesId}`

```typescript
interface PokedexEntry {
  speciesId: string;      // = doc id; references a species in src/data/gamificationContent.ts
  firstCaughtAt: Timestamp;
  caughtCount: number;    // Increments on repeat catches, never decreases
  routeId: string;        // Which route it was first caught on
}
```

One document per **species discovered**, not per catch — a repeat catch increments `caughtCount` on the existing doc. Collection completion % is computed client-side as `pokedexEntries.length / SPECIES.length` (species content is static/bundled, not stored in Firestore).

---

## Firestore Indexes

### Composite Indexes Required

```
Collection: users/{userId}/tasks
─────────────────────────────────
1. status ASC, dueDate ASC
   → "Get all active tasks for a date range" (Day view, Week view)

2. status ASC, priority ASC, dueDate ASC
   → "Get all active tasks sorted by priority then date" (List views)

3. status ASC, dueDate ASC, dueTime ASC
   → "Get all active tasks with deadlines" (Deadline sub-views)

4. repeatSeriesId ASC, dueDate ASC
   → "Get all instances of a repeat series from a date" (Edit future instances)

5. status ASC, categoryId ASC, dueDate ASC
   → "Get tasks by category for a date range" (future: category filter)

6. status ASC, completedAt DESC
   → "Get recently completed tasks" (undo, history)

Collection: users/{userId}/reminders
─────────────────────────────────────
7. status ASC, scheduledAt ASC
   → "Get reminders to fire" (Cloud Function cron)

8. taskId ASC, status ASC
   → "Get all reminders for a task" (task detail view, cleanup)
```

### Single-Field Indexes (Auto-Created)
Firestore automatically creates single-field indexes for every field. No additional single-field indexes needed.

---

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;

      // Tasks sub-collection
      match /tasks/{taskId} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;

        // Validation
        allow create: if request.resource.data.name is string
                      && request.resource.data.name.size() > 0
                      && request.resource.data.name.size() <= 200
                      && request.resource.data.priority in ['P1', 'P2', 'P3']
                      && request.resource.data.status in ['active', 'completed', 'deleted'];
      }

      // Categories sub-collection
      match /categories/{categoryId} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }

      // Settings document
      match /settings {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }

      // Reminders sub-collection
      match /reminders/{reminderId} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }

      // Gamification state (opt-in) — companionXp may only increase;
      // focusPoints may decrease (when spent) but never below 0.
      match /gamification/state {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create: if request.auth != null && request.auth.uid == userId
                      && request.resource.data.focusPoints is int
                      && request.resource.data.focusPoints >= 0
                      && request.resource.data.companionXp is int
                      && request.resource.data.companionXp >= 0;
        allow update: if request.auth != null && request.auth.uid == userId
                      && request.resource.data.focusPoints is int
                      && request.resource.data.focusPoints >= 0
                      && request.resource.data.companionXp is int
                      && request.resource.data.companionXp >= resource.data.companionXp;
        allow delete: if false;
      }

      // Pokedex sub-collection (opt-in) — caughtCount only ever increases.
      match /pokedex/{speciesId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create: if request.auth != null && request.auth.uid == userId
                      && request.resource.data.caughtCount is int
                      && request.resource.data.caughtCount >= 1;
        allow update: if request.auth != null && request.auth.uid == userId
                      && request.resource.data.caughtCount is int
                      && request.resource.data.caughtCount >= resource.data.caughtCount;
        allow delete: if false;
      }
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Data Size Estimates

| Collection | Docs per User (Active) | Doc Size (avg) | Monthly Reads (est.) |
|---|---|---|---|
| tasks | 50–200 | ~500 bytes | ~10,000 (30 day views × ~50 tasks queried) |
| categories | 3–10 | ~200 bytes | ~1,000 (cached after first load) |
| settings | 1 | ~300 bytes | ~100 (cached, rarely changes) |
| reminders | 20–100 | ~300 bytes | ~3,000 (Cloud Function polls) |
| gamification | 1 | ~150 bytes | ~200 (live-subscribed while feature enabled) |
| pokedex | 0–14 | ~100 bytes | ~200 (live-subscribed while feature enabled) |

**Estimated Firestore cost per user per month**: < $0.01 at these volumes (well within free tier for <1000 users).

---

## Offline Strategy

1. **Firestore Offline Persistence**: Enabled by default in the Firebase SDK. All reads hit the local cache first.
2. **Writes queue locally**: When offline, writes go to a local queue and sync when connectivity returns.
3. **Conflict resolution**: Last-write-wins (Firestore default). Acceptable for single-user app.
4. **Cache size**: Set to 100MB (default is 40MB) to accommodate users with many tasks.
5. **Sync indicator**: Listen to `firebase.firestore().enableNetwork()` / `disableNetwork()` and the `onSnapshotsInSync` listener to show sync state in the header.
