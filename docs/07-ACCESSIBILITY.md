# ClearMind — Accessibility Checklist (WCAG 2.1 AA)

## Overview

ClearMind targets **WCAG 2.1 Level AA** compliance. Given the ADHD target audience, accessibility is not a nice-to-have — it's core to the product. Many ADHD users also have co-occurring conditions (dyslexia, anxiety, sensory processing differences) that make accessibility features essential.

---

## 1. Perceivable

### 1.1 Text Alternatives
| Requirement | Implementation | Status |
|---|---|---|
| All images have `alt` text | Decorative images: `alt=""`. Meaningful icons: `aria-label` | Planned |
| Icon-only buttons have text labels | FAB: `aria-label="Add new task"`. Delete: `aria-label="Delete task"` | Planned |
| Priority colors have text equivalents | Color bar always paired with "P1", "P2", "P3" text label | Planned |
| Category chips have readable text | Always show category name, not just color | Planned |

### 1.2 Time-Based Media
- No audio or video content in the app. N/A.

### 1.3 Adaptable
| Requirement | Implementation | Status |
|---|---|---|
| Content is structured with semantic HTML | Use `<main>`, `<nav>`, `<section>`, `<h1>`–`<h3>`, `<ul>`, `<li>` | Planned |
| Reading order matches visual order | DOM order follows visual layout; no CSS reordering that breaks flow | Planned |
| Orientation not locked | App works in portrait and landscape | Planned |
| Input purpose identified | `autocomplete` attributes on login form fields | Planned |

### 1.4 Distinguishable
| Requirement | Implementation | Status |
|---|---|---|
| Color contrast ≥ 4.5:1 (text) | All text colors verified against backgrounds | Planned |
| Color contrast ≥ 3:1 (large text, UI components) | Priority colors, buttons, borders verified | Planned |
| Text resizable to 200% without loss | CSS uses `rem` units; tested at 200% zoom | Planned |
| No content requires horizontal scrolling at 320px | Responsive design tested at 320px width | Planned |
| Non-text contrast ≥ 3:1 | Checkbox borders, card borders, icon strokes all ≥ 3:1 | Planned |
| Content not conveyed by color alone | Priority: color + "P1/P2/P3" text. Heatmap: color + task count | Planned |
| User can customize font size | Settings: font size slider 85%–130% | Planned |

#### Color Contrast Verification

| Element | Foreground | Background | Ratio | Pass? |
|---|---|---|---|---|
| Body text | `#1F2937` | `#FAFAFA` | 15.4:1 | ✅ |
| Secondary text | `#6B7280` | `#FAFAFA` | 5.7:1 | ✅ |
| Muted text | `#9CA3AF` | `#FAFAFA` | 3.5:1 | ✅ (large text only) |
| P1 red on white card | `#EF4444` | `#FFFFFF` | 4.0:1 | ⚠️ (add text label) |
| P2 amber on white card | `#F59E0B` | `#FFFFFF` | 2.8:1 | ⚠️ (add text label) |
| P3 blue on white card | `#3B82F6` | `#FFFFFF` | 4.0:1 | ⚠️ (add text label) |

**Note**: Priority colors alone don't meet 4.5:1 for small text. This is why we always pair them with "P1"/"P2"/"P3" text labels. In high-contrast mode, we use darker variants:
- P1 high-contrast: `#DC2626` (5.2:1)
- P2 high-contrast: `#D97706` (4.6:1)
- P3 high-contrast: `#2563EB` (5.6:1)

---

## 2. Operable

### 2.1 Keyboard Accessible
| Requirement | Implementation | Status |
|---|---|---|
| All functionality available via keyboard | Tab through all interactive elements; Enter/Space to activate | Planned |
| No keyboard traps | Bottom sheets and modals: Escape closes; focus returns to trigger | Planned |
| Skip navigation link | Hidden "Skip to main content" link, visible on focus | Planned |
| Shortcut keys (v2) | Configurable; not active by default to avoid accidental triggers | Planned |

#### Keyboard Shortcuts (v2)

| Key | Action | Context |
|---|---|---|
| `n` | Open quick-add task | Any view |
| `t` | Go to Today | Any view |
| `w` | Go to Week view | Any view |
| `m` | Go to Month view | Any view |
| `j` / `k` | Navigate tasks down/up | List views |
| `Enter` | Open selected task detail | List views |
| `x` | Toggle task complete | Task focused |
| `Delete` | Delete task (with undo) | Task focused |
| `Escape` | Close modal/sheet/menu | When open |
| `?` | Show keyboard shortcut help | Any view |

All shortcuts are disabled by default and enabled in Settings → Accessibility → Keyboard Shortcuts.

### 2.2 Enough Time
| Requirement | Implementation | Status |
|---|---|---|
| Undo toasts persist 6 seconds (no auto-dismiss under 5s) | Toast duration: 6000ms with visible countdown | Planned |
| No time limits on task creation | No session timeouts on forms | Planned |
| Auto-save on task edit forms | Firestore writes on field blur / debounced input | Planned |

### 2.3 Seizures and Physical Reactions
| Requirement | Implementation | Status |
|---|---|---|
| No content flashes > 3 times per second | No flashing animations | Planned |
| Respect `prefers-reduced-motion` | All animations replaced with instant transitions | Planned |
| Reduced motion toggle in settings | User can override OS setting | Planned |

### 2.4 Navigable
| Requirement | Implementation | Status |
|---|---|---|
| Page titles describe purpose | "Today — ClearMind", "Week — ClearMind", etc. | Planned |
| Focus order follows reading order | Logical tab order verified on all views | Planned |
| Link/button purpose clear from text | "Add new task" not "Click here"; "Export as JSON" not "Export" | Planned |
| Multiple ways to reach content | Nav bar + direct URL routing + date picker | Planned |
| Focus visible | Custom `:focus-visible` ring: 2px solid `#3B82F6`, 2px offset | Planned |
| Headings and labels describe content | Section headers: "P1 — Urgent (3)", "Settings", etc. | Planned |

### 2.5 Input Modalities
| Requirement | Implementation | Status |
|---|---|---|
| Touch targets ≥ 44×44px | All buttons, checkboxes, chips verified | Planned |
| Pointer cancellation | Swipe gestures cancel if finger moves back | Planned |
| No drag required | Drag-to-reorder also has "Move up/Move down" menu options | Planned |
| No motion-based input | No shake-to-undo or tilt gestures | Planned |

---

## 3. Understandable

### 3.1 Readable
| Requirement | Implementation | Status |
|---|---|---|
| Page language declared | `<html lang="en">` | Planned |
| Abbreviations explained | "P1" has `title="Priority 1 — Urgent"` or `aria-label` | Planned |
| Reading level appropriate | Short sentences, simple words, no jargon | Planned |

### 3.2 Predictable
| Requirement | Implementation | Status |
|---|---|---|
| No unexpected context changes on focus | Focusing a field doesn't navigate away or open popups | Planned |
| Navigation consistent across pages | Bottom nav always in same position with same items | Planned |
| Components behave consistently | Swipe-right = complete on all screens | Planned |

### 3.3 Input Assistance
| Requirement | Implementation | Status |
|---|---|---|
| Error identification | Inline error messages below fields: "Task name is required" | Planned |
| Labels for all inputs | Every form field has a visible `<label>` | Planned |
| Error suggestion | "Priority must be P1, P2, or P3" — not just "Invalid input" | Planned |
| Error prevention for destructive actions | "Delete all tasks" requires typing "DELETE" to confirm | Planned |

---

## 4. Robust

### 4.1 Compatible
| Requirement | Implementation | Status |
|---|---|---|
| Valid HTML | Pass W3C validator | Planned |
| ARIA roles and properties correct | All custom components use appropriate ARIA roles | Planned |
| Status messages announced | Toast notifications use `role="status"` and `aria-live="polite"` | Planned |
| Name, role, value exposed | Custom components expose correct semantics to AT | Planned |

---

## ARIA Patterns for Custom Components

### Task Card
```html
<article
  role="article"
  aria-label="Submit tax documents, Priority 1 Urgent, due 2:00 PM, Work category"
  tabindex="0"
>
  <div role="checkbox" aria-checked="false" aria-label="Mark complete" tabindex="0"></div>
  <h3>Submit tax documents</h3>
  <span aria-label="Due at 2:00 PM">2:00 PM</span>
  <span aria-label="Category: Work">Work</span>
  <span aria-hidden="true">🔔</span>
  <span class="sr-only">Has reminders</span>
</article>
```

### Bottom Sheet
```html
<div
  role="dialog"
  aria-modal="true"
  aria-label="Add new task"
>
  <!-- Focus trap: Tab cycles within this dialog -->
  <!-- Escape key closes -->
  <!-- On close, focus returns to FAB -->
</div>
```

### Priority Chips (Segmented Control)
```html
<div role="radiogroup" aria-label="Priority">
  <button role="radio" aria-checked="false">P1 Urgent</button>
  <button role="radio" aria-checked="true">P2 Important</button>
  <button role="radio" aria-checked="false">P3 Low</button>
</div>
```

### Toast / Undo Notification
```html
<div role="status" aria-live="polite" aria-atomic="true">
  Task deleted. <button>Undo</button>
</div>
```

### Monthly Heatmap Cell
```html
<button
  aria-label="February 6, 7 tasks, high load"
  class="heatmap-cell heatmap-red"
>
  <span aria-hidden="true">6</span>
</button>
```

---

## Screen Reader Announcements

| Event | Announcement |
|---|---|
| Task created | "Task '{name}' created" |
| Task completed | "Task '{name}' marked as complete" |
| Task deleted | "Task '{name}' deleted. Undo available for 6 seconds" |
| Undo performed | "Undo successful. Task '{name}' restored" |
| View changed | "Now viewing {view name}" |
| Date changed | "Showing tasks for {date}" |
| Reminder snoozed | "Reminder snoozed for {duration}" |
| Import complete | "Imported {count} tasks" |
| Export complete | "Exported {count} tasks as {format}" |

---

## Testing Checklist

### Automated
- [ ] Run `axe-core` on every page (integrate with CI)
- [ ] Lighthouse accessibility audit ≥ 90
- [ ] Color contrast checker on all color combinations
- [ ] HTML validator (no duplicate IDs, valid ARIA)

### Manual
- [ ] Tab through entire app with keyboard only
- [ ] Complete all flows with VoiceOver (macOS/iOS)
- [ ] Complete all flows with NVDA or JAWS (Windows)
- [ ] Complete all flows with TalkBack (Android)
- [ ] Test at 200% browser zoom
- [ ] Test at 320px viewport width
- [ ] Test with `prefers-reduced-motion: reduce`
- [ ] Test with `prefers-contrast: more`
- [ ] Test with custom font size (85% and 130%)
- [ ] Test high-contrast mode toggle
- [ ] Verify all images have appropriate alt text
- [ ] Verify focus indicator visible on all interactive elements
- [ ] Verify no keyboard traps in modals/sheets
