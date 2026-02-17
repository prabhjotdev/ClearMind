# ClearMind — UX Principles for ADHD Users

## Core Philosophy

> "Show less, mean more. Every pixel on screen must earn its place."

ClearMind's UX is designed around the ADHD brain's strengths (creativity, hyperfocus bursts, pattern recognition) while compensating for its challenges (working memory, time blindness, decision fatigue).

---

## Principle 1: Reduce Cognitive Load

### What this means
Every screen should have a single, obvious primary action. Remove anything that doesn't directly serve the user's current intent.

### How we apply it
- **Single Day view is the default landing page** — not a dashboard, not a weekly overview. Today is what matters.
- **Maximum 1 floating action button (FAB)** per screen — "Add Task" is the only persistent action.
- **No nested menus deeper than 2 levels.** If something requires 3 clicks, redesign it.
- **Task cards show only**: priority color bar, task name, due time (if set), category chip, and icons for reminders/repeat. Description is hidden until tap/expand.
- **Empty states are encouraging**, not blank. "Nothing here yet — nice and clear!" instead of an empty void.

### Anti-patterns to avoid
- ❌ Showing all 7 days at once on mobile
- ❌ Dense tables of data
- ❌ Multiple CTAs competing for attention
- ❌ Settings toggles on the main task screen

---

## Principle 2: Progressive Disclosure

### What this means
Show the minimum viable information first. Let users drill in on demand.

### How we apply it
- **Task creation**: Only `name` and `category` are visible in the quick-add form. Tapping "More options" reveals priority, due date, reminders, repeat, description.
- **Monthly view**: Shows colored boxes (heatmap) by default. Tapping a day reveals the task list for that day.
- **Weekly view**: Shows time-slot blocks by default. A toggle switches to list or deadline-only sub-views.
- **Settings**: Grouped into collapsible sections (Account, Notifications, Accessibility, Data).

### Anti-patterns to avoid
- ❌ A 10-field task creation form shown all at once
- ❌ All settings on one scrollable page with no grouping
- ❌ Tooltips that require hover (unreliable on touch)

---

## Principle 3: Strong Visual Hierarchy with Color + Space

### What this means
The eye should know where to look without reading. Use color, size, and whitespace as the primary information layer.

### How we apply it

#### Priority Color System
| Priority | Color | Hex | Usage |
|---|---|---|---|
| P1 (Urgent) | Red | `#EF4444` | Left border bar on card, filled dot in list |
| P2 (Important) | Amber | `#F59E0B` | Left border bar on card, filled dot in list |
| P3 (Low) | Blue | `#3B82F6` | Left border bar on card, filled dot in list |

#### Spacing Rules
- Card-to-card gap: `12px`
- Section header to first card: `8px`
- Screen edge padding: `16px` (mobile), `24px` (tablet+)
- Touch targets: minimum `44×44px` (WCAG 2.5.5)

#### Typography Scale
| Element | Size | Weight | Line Height |
|---|---|---|---|
| Screen title | 24px | 700 | 32px |
| Section header (e.g., "P1 — Urgent") | 16px | 600 | 24px |
| Task name | 16px | 500 | 24px |
| Meta text (time, category) | 13px | 400 | 18px |
| Empty state message | 14px | 400 | 20px |

### Anti-patterns to avoid
- ❌ Using color as the *only* indicator (always pair with text/icon for colorblind users)
- ❌ Thin, low-contrast text
- ❌ Identical visual weight for different priority levels

---

## Principle 4: Gentle, Non-Punishing Reminders

### What this means
Reminders should feel like a helpful nudge from a friend, not an alarm or a guilt trip.

### How we apply it
- **Reminder tone**: Neutral, warm language. "Hey, you have 'Buy groceries' coming up in 15 minutes" — not "OVERDUE: Buy groceries!!!"
- **Missed task handling**: Overdue tasks get a soft visual indicator (muted red background, not flashing). A banner says "You have 2 tasks from yesterday — want to reschedule or mark done?"
- **No streak counters or shame metrics.** No "You missed 3 days in a row."
- **Snooze is first-class**: Every reminder has a snooze option (15m, 1h, tomorrow). Snoozing is not failure.
- **Daily digest** (opt-in): A morning notification summarizing today's tasks. "Good morning! You have 4 tasks today. Your top priority is 'Submit report.'"

### Anti-patterns to avoid
- ❌ Red flashing overdue badges
- ❌ "You haven't opened the app in 3 days!" notifications
- ❌ Removing snooze to "force" action

---

## Principle 5: Forgiving Interactions (Undo > Confirm)

### What this means
Let users act fast and undo mistakes, rather than asking "Are you sure?" before every action.

### How we apply it
- **Deleting a task**: No confirmation dialog. Instead, a toast with "Task deleted — UNDO" that persists for 6 seconds.
- **Completing a task**: Swipe or tap to complete. A brief "Done!" animation plays. Undo available for 6 seconds.
- **Editing a repeating task**: A bottom sheet asks "Edit this task only, or all future tasks?" — only 2 options, no paragraph of explanation.
- **Accidental navigation**: The back gesture/button always works. No trapped modals.

### Anti-patterns to avoid
- ❌ "Are you sure you want to delete?" dialogs for every action
- ❌ Permanent destructive actions with no undo
- ❌ Modal dialogs that block the entire screen

---

## Principle 6: Consistent, Predictable Layout

### What this means
Every screen should feel like the same app. Navigation, action buttons, and content areas stay in the same place.

### How we apply it
- **Bottom navigation bar** (mobile): 4 tabs max — Today, Week, Month, Settings
- **Sidebar navigation** (tablet/desktop): Same 4 sections, expanded with labels
- **FAB position**: Always bottom-right, always "Add Task"
- **Pull-to-refresh**: Available on all list views
- **Swipe gestures**: Consistent across all views — right swipe = complete, left swipe = delete
- **Loading states**: Skeleton screens (not spinners) to reduce perceived wait time

### Anti-patterns to avoid
- ❌ Hamburger menus hiding primary navigation
- ❌ FAB that changes action depending on context
- ❌ Different swipe behaviors on different screens

---

## Principle 7: Sensory Comfort

### What this means
Respect users who are sensitive to motion, sound, or visual noise.

### How we apply it
- **Reduced motion**: Respect `prefers-reduced-motion` OS setting. Replace slide animations with fade or instant transitions.
- **No auto-playing sounds or vibrations** without user opt-in.
- **High contrast mode**: Available in settings. Increases border widths, uses bolder color palette, adds underlines to links.
- **No background patterns or textures.** Solid, muted backgrounds only.
- **Font size control**: Settings slider from 85% to 130% of base size.

---

## Principle 8: Offline-First Confidence

### What this means
The user should never wonder "did that save?" or "is this up to date?"

### How we apply it
- **All writes are local-first** via Firestore offline persistence.
- **A subtle sync indicator** in the header: a small cloud icon with checkmark (synced) or rotating arrows (syncing). No large banners.
- **Conflict resolution**: Last-write-wins for single-user. If a task was edited on two devices offline, the most recent timestamp wins. No complex merge UI.
- **Offline task creation**: Works fully. Tasks queue and sync when connectivity returns.

---

## Design Token Summary

```
/* Colors */
--color-p1: #EF4444;         /* Priority 1 - Urgent */
--color-p2: #F59E0B;         /* Priority 2 - Important */
--color-p3: #3B82F6;         /* Priority 3 - Low */
--color-bg-primary: #FAFAFA; /* Main background */
--color-bg-card: #FFFFFF;    /* Card background */
--color-text-primary: #1F2937;
--color-text-secondary: #6B7280;
--color-text-muted: #9CA3AF;
--color-overdue-bg: #FEF2F2; /* Soft red for overdue */
--color-success: #10B981;    /* Completed tasks */
--color-border: #E5E7EB;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 24px;
--space-2xl: 32px;

/* Radius */
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;

/* Shadows */
--shadow-card: 0 1px 3px rgba(0,0,0,0.08);
--shadow-fab: 0 4px 12px rgba(0,0,0,0.15);

/* Animation */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
```
