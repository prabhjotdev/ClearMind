# ClearMind — Phased MVP Plan

## Phase Overview

| Phase | Focus | Key Outcome |
|---|---|---|
| **MVP** | Core task management + Day view | Users can create, complete, and be reminded about tasks |
| **v1** | All views + polish + data portability | Full app experience with weekly/monthly views, import/export |
| **v2** | Power features + accessibility depth | Keyboard shortcuts, advanced repeat, third-party import |

---

## MVP — Core Task Experience

**Goal**: A functional PWA where a user can sign in, create tasks, see today's tasks sorted by priority, and receive reminders.

### Sprint 1: Project Setup & Auth

| # | Task | Details |
|---|---|---|
| 1.1 | Initialize React project | `create-react-app` with TypeScript template |
| 1.2 | Configure PWA basics | `manifest.json`, basic service worker, app icons |
| 1.3 | Install and configure Firebase | `firebase`, `react-router-dom`, environment config |
| 1.4 | Set up Firestore security rules | Deploy initial rules from `04-DATA-MODEL.md` |
| 1.5 | Implement Google Auth | Firebase Auth with Google provider, auth context |
| 1.6 | Implement Email/Password Auth | Sign up, sign in, password reset flows |
| 1.7 | Create auth guard / protected routes | Redirect unauthenticated users to login |
| 1.8 | Build login/signup UI | Two screens: login and signup, per design spec |
| 1.9 | Create user profile document on first sign-in | Cloud Function or client-side on auth state change |
| 1.10 | Deploy to Firebase Hosting | CI/CD pipeline with GitHub Actions |

### Sprint 2: Data Layer & Task CRUD

| # | Task | Details |
|---|---|---|
| 2.1 | Define TypeScript interfaces | `Task`, `Category`, `UserSettings`, `Reminder` types |
| 2.2 | Create Firestore service layer | CRUD functions: `createTask`, `updateTask`, `deleteTask`, `getTasks` |
| 2.3 | Implement category management | Default categories on onboarding, add/edit/delete custom |
| 2.4 | Build task creation bottom sheet | Quick-add form: name + category (minimum) |
| 2.5 | Build expanded task creation form | Priority, due date/time, description, repeat, reminders |
| 2.6 | Build task edit form | Pre-populated form, save/cancel |
| 2.7 | Build task detail bottom sheet | Read-only view with complete/edit/delete actions |
| 2.8 | Implement soft delete + undo toast | 6-second undo window with `status: 'deleted'` |
| 2.9 | Implement task completion + undo | Checkbox toggle, completion animation, undo toast |
| 2.10 | Enable Firestore offline persistence | `enableIndexedDbPersistence()` call on init |

### Sprint 3: Single Day View

| # | Task | Details |
|---|---|---|
| 3.1 | Build Day view layout | Date nav header + summary bar + task list |
| 3.2 | Implement priority grouping | Group tasks by P1/P2/P3 with section headers |
| 3.3 | Build task card component | Color bar, name, time, category chip, icons |
| 3.4 | Implement date navigation | Arrow buttons + swipe + date picker popup |
| 3.5 | Build overdue tasks section | Collapsible section with reschedule/dismiss actions |
| 3.6 | Build empty state | Encouraging illustration + "Add a task" CTA |
| 3.7 | Implement pull-to-refresh | Refresh Firestore query on pull gesture |
| 3.8 | Build swipe gestures on cards | Right = complete, Left = delete (with undo) |
| 3.9 | Add summary progress bar | Completed/total count with thin progress bar |
| 3.10 | Implement real-time listeners | Firestore `onSnapshot` for live updates |

### Sprint 4: Reminders & Notifications

| # | Task | Details |
|---|---|---|
| 4.1 | Request notification permission | Prompt during onboarding or first reminder setup |
| 4.2 | Register FCM token | Save token to user settings on permission grant |
| 4.3 | Build reminder creation UI | Offset picker in task creation form |
| 4.4 | Implement reminder scheduling | Create reminder docs when task is saved |
| 4.5 | Deploy reminder Cloud Function | Cron function that queries and sends due reminders |
| 4.6 | Build service worker notification handler | Handle `push` event, show notification with actions |
| 4.7 | Implement notification actions | "Done" and "Snooze 15m" actions in notification |
| 4.8 | Build in-app notification panel | Slide-in panel from header bell icon |
| 4.9 | Implement snooze logic | Reschedule reminder with snooze count tracking |
| 4.10 | Cancel reminders on task complete/delete | Cleanup function that cancels pending reminders |

### Sprint 5: Repeat Tasks & Onboarding

| # | Task | Details |
|---|---|---|
| 5.1 | Implement repeat instance generation | Generate 30-day rolling window of instances |
| 5.2 | Deploy daily Cloud Function for instance generation | Midnight cron to fill rolling window |
| 5.3 | Handle "edit this" vs "edit all future" | Bottom sheet choice, batch update for "all future" |
| 5.4 | Handle "stop repeating" | Set `repeat: none`, soft-delete future instances |
| 5.5 | Handle monthly edge case (31st) | Clamp to last day of month |
| 5.6 | Build onboarding flow | 5 screens: welcome, sign in, categories, tour, done |
| 5.7 | Create default categories on first sign-in | Work, Personal, Health with icons and colors |
| 5.8 | Add "Today" pill for non-today navigation | Snap-back button when viewing another day |
| 5.9 | Implement bottom navigation bar | 4 tabs: Today, Week, Month, Settings |
| 5.10 | PWA install prompt | Detect `beforeinstallprompt`, show custom install banner |

---

## v1 — Full Views & Polish

**Goal**: All three views (Day, Week, Month) fully functional, settings panel complete, import/export working.

### Sprint 6: Weekly View

| # | Task | Details |
|---|---|---|
| 6.1 | Build weekly view layout with sub-view toggle | Segmented control: Calendar / List / Deadlines |
| 6.2 | Build weekly calendar grid (tablet+) | Time axis + day columns + task blocks |
| 6.3 | Position tasks by time in calendar grid | Calculate top offset from time, height from duration |
| 6.4 | Implement task block drag-to-reschedule | Drag block to new time/day, update Firestore |
| 6.5 | Build weekly list sub-view | Priority-grouped list for the week |
| 6.6 | Build deadlines sub-view | Day-grouped list of tasks with date+time |
| 6.7 | Implement week navigation | Arrow buttons + swipe + "This Week" pill |
| 6.8 | Hide calendar grid on mobile, show note | "Use a larger screen for calendar view" |
| 6.9 | Build all-day task row in calendar | Tasks without time shown above time grid |
| 6.10 | Weekly empty state | Encouraging message + add task CTA |

### Sprint 7: Monthly View

| # | Task | Details |
|---|---|---|
| 7.1 | Build monthly heatmap grid | 7-column calendar with colored day cells |
| 7.2 | Implement heatmap color logic | Query task counts per day, apply threshold colors |
| 7.3 | Add tap-to-navigate on heatmap cells | Tapping a day goes to Day view for that date |
| 7.4 | Highlight today's cell | Bold border ring on current date |
| 7.5 | Build monthly deadlines sub-view | Day-grouped list of deadline tasks |
| 7.6 | Implement month navigation | Arrow buttons + swipe + "This Month" pill |
| 7.7 | Add legend to heatmap | Color key: green/orange/red with threshold labels |
| 7.8 | Add long-press/hover on cells | Show tooltip with task count |
| 7.9 | Monthly empty state | Message for months with no tasks |
| 7.10 | Optimize queries for monthly view | Single query for all tasks in month, aggregate client-side |

### Sprint 8: Settings & Data

| # | Task | Details |
|---|---|---|
| 8.1 | Build settings layout | Collapsible sections per design spec |
| 8.2 | Implement account section | Display name, email, sign out |
| 8.3 | Build notification preferences | Push, in-app, daily digest toggles and time picker |
| 8.4 | Build accessibility settings | Font size slider, reduced motion, high contrast toggles |
| 8.5 | Implement heatmap threshold configuration | Two number inputs for medium and high thresholds |
| 8.6 | Implement week-start-day setting | Monday/Sunday toggle |
| 8.7 | Build JSON export | Generate file, trigger download |
| 8.8 | Build CSV export | Generate file with proper escaping, trigger download |
| 8.9 | Build import flow (JSON + CSV) | File picker, parsing, preview, duplicate handling |
| 8.10 | Implement "Delete all tasks" with confirmation | Type "DELETE" to confirm, hard-delete all docs |

### Sprint 9: Polish & Performance

| # | Task | Details |
|---|---|---|
| 9.1 | Implement skeleton loading screens | Placeholder UI while Firestore queries resolve |
| 9.2 | Add animations (with reduced motion support) | Task card enter, complete check, swipe dismiss |
| 9.3 | Implement sync indicator | Cloud icon in header showing sync state |
| 9.4 | Optimize bundle size | Code splitting per route, lazy load views |
| 9.5 | Improve service worker caching | Cache static assets, API responses with Workbox |
| 9.6 | Implement sidebar nav for tablet/desktop | Responsive layout switch at 768px breakpoint |
| 9.7 | Add toast notification system | Reusable toast component with undo support |
| 9.8 | Implement timezone detection + prompt | Detect timezone change, offer to adjust |
| 9.9 | Deploy Firestore composite indexes | All indexes from `04-DATA-MODEL.md` |
| 9.10 | End-to-end testing | Cypress tests for critical flows: auth, CRUD, views |

---

## v2 — Power Features & Accessibility Depth

**Goal**: Advanced features for power users, comprehensive accessibility, and third-party compatibility.

### Sprint 10: Keyboard & Accessibility

| # | Task | Details |
|---|---|---|
| 10.1 | Implement keyboard shortcuts system | Configurable shortcut registry |
| 10.2 | Add all keyboard shortcuts from accessibility doc | n, t, w, m, j, k, Enter, x, Delete, Escape, ? |
| 10.3 | Build keyboard shortcut help overlay | `?` key shows modal with all shortcuts |
| 10.4 | Implement screen reader mode enhancements | Extra ARIA attributes, simplified layouts |
| 10.5 | Run full WCAG 2.1 AA audit | axe-core + manual testing with VoiceOver/NVDA |
| 10.6 | Fix all audit findings | Address each issue from the audit |
| 10.7 | Add focus management to all modals/sheets | Focus trap, return focus on close |
| 10.8 | Implement high-contrast mode CSS | Darker colors, thicker borders, underlined links |
| 10.9 | Test at all font sizes (85%–130%) | Verify no layout breaks |
| 10.10 | Accessibility documentation for contributors | Guide for maintaining WCAG compliance |

### Sprint 11: Advanced Features

| # | Task | Details |
|---|---|---|
| 11.1 | Implement daily digest Cloud Function | Morning notification with task summary |
| 11.2 | Add Todoist CSV import support | Auto-detect and map Todoist columns |
| 11.3 | Add Google Tasks JSON import support | Auto-detect and map Google Tasks structure |
| 11.4 | Implement category filtering on views | Filter chip bar on Day/Week views |
| 11.5 | Add task search | Search bar in header, full-text search on name/description |
| 11.6 | Implement drag-to-reorder within priority groups | Long-press + drag on Day view |
| 11.7 | Add "Reschedule All" for overdue tasks | Batch update overdue tasks to today |
| 11.8 | Implement custom reminder offsets | User types in minutes/hours/days |
| 11.9 | Cloud Function: cleanup old deleted tasks | Delete `status: 'deleted'` docs older than 30 days |
| 11.10 | Performance monitoring | Firebase Performance SDK integration |

### Sprint 12: Final Polish & Launch

| # | Task | Details |
|---|---|---|
| 12.1 | Lighthouse audit: PWA ≥ 90, A11y ≥ 90 | Fix any remaining issues |
| 12.2 | Cross-browser testing | Chrome, Firefox, Safari, Edge |
| 12.3 | Cross-device testing | iPhone, Android, iPad, desktop |
| 12.4 | Load testing | Simulate 1000 tasks per user, verify performance |
| 12.5 | Security review | Check Firestore rules, auth flows, XSS prevention |
| 12.6 | Privacy policy page | Required for app stores and GDPR |
| 12.7 | Terms of service page | Basic terms |
| 12.8 | App store listing content | Screenshots, description for PWA directories |
| 12.9 | Analytics setup | Firebase Analytics events for key metrics from PRD |
| 12.10 | Launch checklist sign-off | Final review of all features and metrics |

---

## Task Sizing Guide

Each task above is designed to be completable in a **focused session**. The breakdown follows these principles:

- **One concern per task**: Each task does one thing (build a component, implement a function, deploy a rule).
- **Testable outcome**: Every task has a visible result you can verify.
- **No hidden complexity**: Edge cases are called out as separate tasks (e.g., 5.5 for monthly edge case).
- **Dependencies are sequential**: Tasks within a sprint are ordered by dependency. Tasks across sprints are independent where possible.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Routing | React Router v6 |
| State management | React Context + useReducer (no Redux needed for this scope) |
| Styling | CSS Modules or Tailwind CSS |
| Auth | Firebase Auth (Google + Email/Password) |
| Database | Firestore (with offline persistence) |
| Cloud Functions | Firebase Cloud Functions (Node.js) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Hosting | Firebase Hosting |
| PWA tooling | Workbox (via CRA service worker or custom) |
| Testing | Jest + React Testing Library + Cypress |
| CI/CD | GitHub Actions |
| Linting | ESLint + Prettier |

---

## Definition of Done (per task)

A task is "done" when:
1. Code is written and compiles without errors
2. The feature works as described in the design docs
3. Basic error states are handled
4. The component is responsive (tested at 320px and 1024px)
5. No accessibility regressions (axe-core passes)
6. Code is committed with a descriptive message
