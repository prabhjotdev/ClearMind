# ClearMind — Product Requirements Document

## 1. Problem Statement

People with ADHD face unique challenges with task management:

- **Working memory limitations**: Forgetting tasks moments after thinking of them
- **Task overwhelm**: Long flat lists trigger anxiety and avoidance
- **Time blindness**: Poor sense of how much time has passed or remains
- **Decision paralysis**: Too many options or equal-priority items cause freeze
- **Inconsistent routine**: Difficulty maintaining habits without external cues
- **Context switching cost**: Re-orienting after interruptions is expensive

Existing task apps (Todoist, TickTick, Google Tasks) are designed for neurotypical workflows. They present dense information, flat hierarchies, and assume users can self-regulate attention. ClearMind is purpose-built for the ADHD brain.

## 2. Target User

**Primary persona — "Alex"**
- Age 22–40, diagnosed or self-identified ADHD (inattentive or combined type)
- Uses a phone as primary device, occasionally an iPad or laptop
- Has tried 3+ task apps and abandoned each within weeks
- Needs external structure but resents rigid systems
- Motivated by visual progress and gentle accountability

**Secondary persona — "Sam"**
- Caregiver, parent, or partner of someone with ADHD
- Wants a shared view or gentle way to check on progress
- Not an active user of the task system itself (future scope)

## 3. Product Vision

A calm, focused task management PWA that:
- Shows **only what matters right now** (today-first design)
- Uses **color and spatial cues** instead of text-heavy UIs
- Provides **gentle, persistent reminders** without shame
- Supports **offline-first** usage (PWA)
- Is **installable** on any device like a native app

## 4. Non-Goals (Explicitly Out of Scope)

| Non-Goal | Reason |
|---|---|
| Real-time collaboration / shared boards | Adds complexity; focus on individual use first |
| AI-powered task suggestions | Scope creep; can be v3+ |
| Integration with Google Calendar / Outlook | Valuable but deferred to v2 |
| Gamification (streaks, XP, badges) | Can backfire for ADHD users (shame spiral on missed days) |
| Sub-tasks / nested task hierarchies | Increases cognitive load; flat list with categories is enough for MVP |
| Natural language input ("do laundry tomorrow at 3pm") | Nice-to-have, not MVP |
| Dark mode | Deferred to v1 (high-contrast mode covers accessibility) |

## 5. Success Metrics

### Engagement
| Metric | Target | Measurement |
|---|---|---|
| Daily Active Users (DAU) | 60% of registered users return daily within first 2 weeks | Firebase Analytics |
| Task completion rate | ≥ 40% of created tasks marked done within 48h | Firestore aggregation |
| Reminder interaction rate | ≥ 50% of push reminders opened or dismissed (not ignored) | FCM analytics |

### Retention
| Metric | Target | Measurement |
|---|---|---|
| Week-1 retention | ≥ 50% | Cohort analysis |
| Week-4 retention | ≥ 30% | Cohort analysis |
| App uninstall rate | < 20% in first month | PWA install analytics |

### Usability
| Metric | Target | Measurement |
|---|---|---|
| Time to create a task | < 15 seconds | Session recording sampling |
| Onboarding completion | ≥ 80% | Funnel tracking |
| Accessibility score | Lighthouse ≥ 90 | Automated CI check |

### Quality
| Metric | Target | Measurement |
|---|---|---|
| Lighthouse PWA score | ≥ 90 | CI |
| Offline task creation success | 100% | Integration tests |
| Push notification delivery | ≥ 95% (when permission granted) | FCM dashboard |

## 6. Core Features Summary

| Feature | Priority | Phase |
|---|---|---|
| Google Auth + Email/Password login | P0 | MVP |
| Task CRUD (name, description, priority, due date, category) | P0 | MVP |
| Single Day view (priority-sorted) | P0 | MVP |
| Push + in-app reminders | P0 | MVP |
| Repeat tasks (daily/weekly/monthly) | P0 | MVP |
| Weekly calendar view | P1 | MVP |
| Monthly heatmap view | P1 | MVP |
| Offline support (service worker + IndexedDB sync) | P1 | MVP |
| PWA installable | P1 | MVP |
| Import/export (JSON + CSV) | P2 | v1 |
| Accessibility settings panel | P2 | v1 |
| User-configurable heatmap thresholds | P3 | v1 |
| Notification preferences per type | P2 | v1 |
| Keyboard shortcuts | P3 | v2 |
