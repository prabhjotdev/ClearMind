# ClearMind — Detailed UI Design

## Global Shell

### Mobile Layout (< 768px)
```
┌─────────────────────────────┐
│  ☰ ClearMind    🔔  👤      │  ← Header (56px)
├─────────────────────────────┤
│                             │
│                             │
│      Content Area           │  ← Scrollable
│                             │
│                             │
│                        [+]  │  ← FAB (56×56px)
├─────────────────────────────┤
│  📅 Today  📋 Week  📊 Month  ⚙ │  ← Bottom Nav (64px)
└─────────────────────────────┘
```

### Tablet/Desktop Layout (≥ 768px)
```
┌──────────┬──────────────────────────────┐
│          │  ClearMind      🔔  👤       │
│  📅 Today │─────────────────────────────│
│  📋 Week  │                             │
│  📊 Month │      Content Area           │
│          │                             │
│  ─────── │                        [+]  │
│  ⚙ Settings│                            │
└──────────┴──────────────────────────────┘
   Sidebar      Main Content
   (200px)
```

### Header Components
| Element | Behavior |
|---|---|
| App title / logo | Tapping returns to Today view |
| Notification bell 🔔 | Opens notification center (slide-in panel from right) |
| Avatar 👤 | Opens account menu (sign out, profile) |
| Sync indicator | Small cloud icon next to title — ✓ synced, ↻ syncing, ⚠ offline |

### FAB (Floating Action Button)
- Position: bottom-right, 16px from edges
- Size: 56×56px
- Icon: `+` (plus)
- Action: Opens quick-add task bottom sheet
- On scroll-down: FAB shrinks to 48×48px (mini FAB)
- On scroll-up: FAB returns to full size

---

## View 1: Single Day View (Default / Home)

### Layout
```
┌─────────────────────────────┐
│  ← →  Tuesday, Feb 17      │  ← Date nav (swipeable)
├─────────────────────────────┤
│  ▎ 3 tasks today            │  ← Summary bar
├─────────────────────────────┤
│                             │
│  P1 — Urgent (1)           │  ← Section header
│  ┌─────────────────────────┐│
│  │🔴 Submit tax docs       ││
│  │   📅 2:00 PM · 💼 Work  · 🔔 · 🔁 ││  ← Task card
│  └─────────────────────────┘│
│                             │
│  P2 — Important (1)        │  ← Section header
│  ┌─────────────────────────┐│
│  │🟡 Grocery shopping      ││
│  │   💼 Personal · 🔔      ││
│  └─────────────────────────┘│
│                             │
│  P3 — Low (1)              │  ← Section header
│  ┌─────────────────────────┐│
│  │🔵 Organize desk         ││
│  │   💼 Home               ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Date Navigation
- Left/right arrows or horizontal swipe to change day
- Tapping the date text opens a date picker (calendar popup)
- "Today" pill button appears when viewing a different day, tapping snaps back

### Summary Bar
- Shows total task count, and a micro progress bar (completed / total)
- Example: "▎ 3 tasks today · 1 done" with a thin green progress bar beneath

### Task Card Anatomy
```
┌──┬────────────────────────────┐
│  │  Task Name                 │
│C │  📅 2:00 PM · 💼 Category  · 🔔 · 🔁 │
│  │                            │
└──┴────────────────────────────┘
 ↑
 Color bar (4px wide, full height)
 Red=#EF4444, Amber=#F59E0B, Blue=#3B82F6
```

| Element | Details |
|---|---|
| Color bar | 4px wide, left edge, full card height. Color = priority |
| Task name | 16px, medium weight. Truncate with ellipsis at 2 lines |
| Due time | Shown only if task has a time. Format: `h:mm A` |
| Category chip | Small rounded pill with category name |
| Reminder icon 🔔 | Shown only if ≥1 reminder is set |
| Repeat icon 🔁 | Shown only if repeat ≠ none |
| Checkbox | Left of task name (circular, 24px). Tap to complete |

### Task Card Interactions
| Action | Trigger | Result |
|---|---|---|
| View details | Tap card body | Slide-up detail sheet |
| Complete task | Tap checkbox OR swipe right | Check animation + toast with undo |
| Delete task | Swipe left | Card slides out + toast with undo |
| Edit task | Tap card → detail sheet → "Edit" button | Opens edit form |
| Reorder | Long-press + drag | Reorder within priority group |

### Overdue Tasks Section
- If there are overdue tasks from previous days, show a collapsible section at the top:
```
┌─────────────────────────────┐
│  ⚠ 2 overdue tasks          │  ← Tappable to expand
│  ┌─────────────────────────┐│
│  │🔴 Overdue task 1 · Feb 15││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │🟡 Overdue task 2 · Feb 16││
│  └─────────────────────────┘│
│  [Reschedule All]  [Dismiss]│  ← Action buttons
└─────────────────────────────┘
```
- Background: `--color-overdue-bg` (soft red tint)
- "Reschedule All" moves them to today. "Dismiss" marks them as not-overdue (keeps them incomplete).

### Empty State
```
┌─────────────────────────────┐
│                             │
│        🌿                    │
│   All clear for today!      │
│   Enjoy your free time.     │
│                             │
│   [+ Add a task]            │
│                             │
└─────────────────────────────┘
```
- Calming illustration or icon
- Encouraging, low-pressure copy
- Single CTA to add a task

---

## View 2: Weekly View

### Sub-View Selector
A segmented control at the top toggles between sub-views:
```
┌─────────────────────────────────┐
│  [Calendar]  [List]  [Deadlines]│
└─────────────────────────────────┘
```

### Sub-View A: Weekly Calendar Grid (Default, tablet+ only)

On mobile (< 768px), this sub-view is **hidden**. The List sub-view is the default on mobile, with a note: "Switch to a larger screen for calendar view."

```
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│      │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │
│      │ 2/16 │ 2/17 │ 2/18 │ 2/19 │ 2/20 │ 2/21 │ 2/22 │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 8 AM │      │ ████ │      │      │      │      │      │
│ 9 AM │ ████ │      │      │      │      │      │      │
│10 AM │      │      │      │ ████ │      │      │      │
│11 AM │      │      │      │      │      │      │      │
│12 PM │      │      │ ████ │      │      │      │      │
│ ...  │      │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
  Time    ← Tasks positioned as colored blocks →
  slots
```

| Element | Details |
|---|---|
| Time axis | Left column, 1-hour slots, 6 AM – 11 PM |
| Day columns | Mon–Sun headers with date |
| Task blocks | Colored by priority, height proportional to duration (default 1h if no duration) |
| Today column | Highlighted with subtle background tint |
| All-day tasks | Shown in a row above the time grid (no time = all-day) |
| Click/tap block | Opens task detail sheet |
| Drag block | Reschedule task to new time/day |

#### Week Navigation
- Left/right arrows or swipe to change week
- "This Week" pill appears when viewing a different week

### Sub-View B: Weekly List View

Available on all screen sizes. Default on mobile.

```
┌─────────────────────────────┐
│  Week of Feb 16 – 22   ← → │
├─────────────────────────────┤
│                             │
│  P1 — Urgent (3)           │
│  ┌─────────────────────────┐│
│  │🔴 Submit tax docs       ││
│  │   📅 Tue 2:00 PM · 💼 Work ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │🔴 Doctor appointment    ││
│  │   📅 Thu 10:00 AM · 💼 Health ││
│  └─────────────────────────┘│
│  ...                        │
│                             │
│  P2 — Important (4)        │
│  ...                        │
│                             │
│  P3 — Low (2)              │
│  ...                        │
└─────────────────────────────┘
```

- Same card format as Day view, but includes day name in the date
- Grouped by priority, sorted by date+time within each group

### Sub-View C: Deadlines Only

Shows only tasks that have both a date and a time set (i.e., hard deadlines).

```
┌─────────────────────────────┐
│  Deadlines This Week   ← → │
├─────────────────────────────┤
│                             │
│  Tuesday, Feb 17            │
│  ┌─────────────────────────┐│
│  │🔴 Submit tax docs       ││
│  │   ⏰ 2:00 PM · 💼 Work  ││
│  └─────────────────────────┘│
│                             │
│  Thursday, Feb 19           │
│  ┌─────────────────────────┐│
│  │🔴 Doctor appointment    ││
│  │   ⏰ 10:00 AM · 💼 Health ││
│  └─────────────────────────┘│
│                             │
│  No more deadlines this week│
│  ✨ Looking manageable!     │
└─────────────────────────────┘
```

- Grouped by day (chronological)
- Only tasks with `dueDate` that includes a time component
- Encouraging footer when list is short

### Weekly Empty State
```
No tasks this week yet.
Plan ahead — or enjoy the break! 🌊
[+ Add a task]
```

---

## View 3: Monthly View

### Sub-View Selector
```
┌─────────────────────────────────┐
│  [Heatmap]  [Deadlines]        │
└─────────────────────────────────┘
```

### Sub-View A: Monthly Heatmap

```
┌─────────────────────────────────────┐
│  ← February 2026 →                 │
├─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│     │     │     │     │     │     │ 🟢1 │
│─────┼─────┼─────┼─────┼─────┼─────┼─────│
│ 🟢2 │ 🟠3 │ 🟢4 │ 🟢5 │ 🔴6 │ 🟢7 │ 🟢8 │
│─────┼─────┼─────┼─────┼─────┼─────┼─────│
│ 🟠9 │🟢10 │🟢11 │🟢12 │🟢13 │🟢14 │🟢15 │
│─────┼─────┼─────┼─────┼─────┼─────┼─────│
│🟠16 │🟢17 │🟢18 │🟢19 │🟢20 │🟢21 │🟢22 │
│─────┼─────┼─────┼─────┼─────┼─────┼─────│
│🟢23 │🟢24 │🟢25 │🟢26 │🟢27 │🟢28 │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘

Legend: 🟢 0–2 tasks  🟠 3–4 tasks  🔴 5+ tasks
```

#### Heatmap Color Rules (User-Configurable)
| Condition | Default Color | Hex |
|---|---|---|
| Total tasks > high threshold (default: 5) | Red | `#EF4444` |
| Total tasks ≥ medium threshold (default: 3) AND ≤ high | Orange | `#F59E0B` |
| Total tasks < medium threshold | Green | `#22C55E` |

- Thresholds are configurable in Settings
- Each day cell shows: colored dot + day number + task count on hover/long-press
- Tapping a day navigates to the Single Day view for that date
- Today's cell has a bold border ring

#### Month Navigation
- Left/right arrows or swipe to change month
- "This Month" pill appears when viewing a different month

### Sub-View B: Monthly Deadlines

```
┌─────────────────────────────────────┐
│  ← February 2026 →                 │
├─────────────────────────────────────┤
│                                     │
│  Tuesday, Feb 3                     │
│  ┌─────────────────────────────────┐│
│  │🔴 Submit tax docs · 2:00 PM    ││
│  └─────────────────────────────────┘│
│                                     │
│  Friday, Feb 6                      │
│  ┌─────────────────────────────────┐│
│  │🟡 Dentist · 9:30 AM            ││
│  │🔴 Project deadline · 5:00 PM   ││
│  └─────────────────────────────────┘│
│                                     │
│  Thursday, Feb 19                   │
│  ┌─────────────────────────────────┐│
│  │🔴 Doctor appointment · 10:00 AM││
│  └─────────────────────────────────┘│
│                                     │
│  ... (scrollable)                   │
└─────────────────────────────────────┘
```

- Chronological list, grouped by day
- Only tasks with `dueDate` including time
- Compact card format (single line per task: priority dot + name + time)

---

## Task Creation Flow

### Quick Add (Bottom Sheet)

Triggered by tapping the FAB.

```
┌─────────────────────────────────────┐
│  ─── (drag handle)                  │
│                                     │
│  What do you need to do?            │
│  ┌─────────────────────────────────┐│
│  │ Task name...                    ││  ← Auto-focused text input
│  └─────────────────────────────────┘│
│                                     │
│  Category:                          │
│  [Work] [Personal] [Health] [+ New] │  ← Chip selector
│                                     │
│  [+ More options]                   │  ← Expands below
│                                     │
│  [Save Task]                        │  ← Primary CTA
└─────────────────────────────────────┘
```

### Expanded Options (Progressive Disclosure)

When "+ More options" is tapped:

```
┌─────────────────────────────────────┐
│  ─── (drag handle)                  │
│                                     │
│  What do you need to do?            │
│  ┌─────────────────────────────────┐│
│  │ Task name...                    ││
│  └─────────────────────────────────┘│
│                                     │
│  Category:                          │
│  [Work] [Personal] [Health] [+ New] │
│                                     │
│  Priority:                          │
│  [P1 Urgent] [P2 Important] [P3 Low]│  ← Default: P3
│                                     │
│  Due date:    [Pick date]           │
│  Due time:    [Pick time]           │  ← Only shown if date is set
│                                     │
│  Description:                       │
│  ┌─────────────────────────────────┐│
│  │ Add notes... (optional)         ││
│  └─────────────────────────────────┘│
│                                     │
│  Repeat:                            │
│  [None] [Daily] [Weekly] [Monthly]  │  ← Chip selector
│                                     │
│  Reminders:                         │
│  [+ Add reminder]                   │
│  • At time of task        [✕]       │
│  • 15 minutes before      [✕]       │
│                                     │
│  [- Less options]                   │
│                                     │
│  [Save Task]                        │
└─────────────────────────────────────┘
```

### Reminder Picker Sub-Sheet

When "+ Add reminder" is tapped:

```
┌─────────────────────────────────────┐
│  When should we remind you?         │
│                                     │
│  ○ At time of task                  │
│  ○ 5 minutes before                │
│  ○ 15 minutes before               │
│  ○ 30 minutes before               │
│  ○ 1 hour before                   │
│  ○ 1 day before                    │
│  ○ Custom...                        │
│                                     │
│  [Add]  [Cancel]                    │
└─────────────────────────────────────┘
```

### Task Detail Sheet

Opened by tapping a task card:

```
┌─────────────────────────────────────┐
│  ─── (drag handle)                  │
│                                     │
│  🔴 P1 — Urgent                     │
│                                     │
│  Submit tax documents               │  ← Task name (20px, bold)
│                                     │
│  Gather W-2 forms and submit via    │
│  TurboTax before deadline.          │  ← Description
│                                     │
│  📅  Tuesday, Feb 17 at 2:00 PM    │  ← Due date/time
│  💼  Work                           │  ← Category
│  🔔  15 min before, 1 hour before  │  ← Reminders
│  🔁  None                           │  ← Repeat
│                                     │
│  Created: Feb 14 · Modified: Feb 16│
│                                     │
│  [✓ Complete]  [✏ Edit]  [🗑 Delete]│  ← Action bar
└─────────────────────────────────────┘
```

---

## Settings View

### Layout
```
┌─────────────────────────────────────┐
│  ← Settings                        │
├─────────────────────────────────────┤
│                                     │
│  ACCOUNT                            │
│  ┌─────────────────────────────────┐│
│  │ 👤 Alex Johnson                 ││
│  │    alex@email.com               ││
│  │    [Sign Out]                   ││
│  └─────────────────────────────────┘│
│                                     │
│  NOTIFICATIONS ▾                    │  ← Collapsible section
│  ┌─────────────────────────────────┐│
│  │ Push notifications    [toggle]  ││
│  │ In-app notifications  [toggle]  ││
│  │ Daily digest          [toggle]  ││
│  │ Digest time           [8:00 AM] ││
│  │ Reminder sound        [Default] ││
│  └─────────────────────────────────┘│
│                                     │
│  ACCESSIBILITY ▾                    │
│  ┌─────────────────────────────────┐│
│  │ Font size        [──●──] 100%  ││
│  │ Reduced motion        [toggle]  ││
│  │ High contrast         [toggle]  ││
│  │ Screen reader mode    [toggle]  ││
│  └─────────────────────────────────┘│
│                                     │
│  DISPLAY ▾                          │
│  ┌─────────────────────────────────┐│
│  │ Monthly heatmap thresholds      ││
│  │   Red when tasks >  [5]        ││
│  │   Orange when tasks ≥ [3]      ││
│  │ Week starts on       [Monday ▾]││
│  └─────────────────────────────────┘│
│                                     │
│  DATA ▾                             │
│  ┌─────────────────────────────────┐│
│  │ Export tasks (JSON)  [Export]   ││
│  │ Export tasks (CSV)   [Export]   ││
│  │ Import tasks         [Import]  ││
│  │ Delete all tasks     [Delete]  ││
│  └─────────────────────────────────┘│
│                                     │
│  ABOUT                              │
│  ┌─────────────────────────────────┐│
│  │ Version 1.0.0                   ││
│  │ Privacy Policy                  ││
│  │ Terms of Service               ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## Notification Center (Slide-In Panel)

```
┌─────────────────────────────────────┐
│  Notifications          [Clear All] │
├─────────────────────────────────────┤
│                                     │
│  NOW                                │
│  ┌─────────────────────────────────┐│
│  │ 🔔 Submit tax docs in 15 min   ││
│  │    [Snooze 1h]  [View]         ││
│  └─────────────────────────────────┘│
│                                     │
│  EARLIER TODAY                      │
│  ┌─────────────────────────────────┐│
│  │ 🔔 Grocery shopping reminder   ││
│  │    Snoozed from 10:00 AM       ││
│  │    [Snooze 1h]  [View]         ││
│  └─────────────────────────────────┘│
│                                     │
│  YESTERDAY                          │
│  ┌─────────────────────────────────┐│
│  │ ⚠ Buy birthday gift is overdue ││
│  │    [Reschedule]  [View]        ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## Onboarding Flow (First Launch)

### Screen 1: Welcome
```
Welcome to ClearMind 🌿

A task app designed for how
your brain actually works.

[Get Started]
```

### Screen 2: Sign In
```
Sign in to sync your tasks
across devices.

[Sign in with Google]
[Sign in with Email]
[Skip for now]  ← uses local-only mode
```

### Screen 3: Categories Setup
```
What areas of your life do you
want to organize?

[✓ Work] [✓ Personal] [Health]
[Home] [School] [Finance]
[+ Custom]

(Select at least 1)

[Continue]
```

### Screen 4: Quick Tour (Skippable)
```
Swipe through 3 cards:
1. "Your day at a glance" — screenshot of Day view
2. "Gentle reminders, not alarms" — reminder example
3. "See your month at a glance" — heatmap preview

[Skip Tour]  [Next →]
```

### Screen 5: Done
```
You're all set!
Let's add your first task.

[Add First Task]  [Go to Today]
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|---|---|---|
| Mobile | < 768px | Bottom nav, single column, no calendar grid |
| Tablet | 768px – 1024px | Sidebar nav, calendar grid available, 2-column where useful |
| Desktop | > 1024px | Sidebar nav (wider), calendar grid, more whitespace |

## Animation Specifications

| Animation | Duration | Easing | Reduced Motion Alternative |
|---|---|---|---|
| Task card appear | 250ms | ease-out | Instant (opacity 0→1, no transform) |
| Task complete checkmark | 400ms | spring | Instant check |
| Card swipe dismiss | 200ms | ease-in | Instant removal |
| Bottom sheet open | 300ms | ease-out | Instant appear |
| Bottom sheet close | 200ms | ease-in | Instant disappear |
| Page transition | 250ms | ease-in-out | Instant switch |
| FAB shrink/grow | 150ms | ease-out | No animation |
| Toast appear/dismiss | 200ms / 150ms | ease-out / ease-in | Instant |
