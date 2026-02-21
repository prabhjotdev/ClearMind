# ClearMind — Accessibility Guide for Contributors

This document explains how to maintain WCAG 2.1 AA compliance when contributing to ClearMind. Many of our users have ADHD and co-occurring conditions, so accessibility is a core product requirement — not an afterthought.

---

## Core Principles

1. **All functionality must be keyboard-operable.** If you can't complete an action without a mouse, it's a bug.
2. **Color is never the only indicator.** Every color-coded element (priority, category) also has a text label.
3. **Focus is always visible.** The `:focus-visible` ring is defined globally in `global.css` — never suppress it.
4. **Screen reader announcements are explicit.** Use `aria-live` regions for dynamic content, `aria-label` on icon-only buttons, and `.sr-only` text for context that's only visual.

---

## Semantic HTML

Use the right HTML element for the job:

| Element | When to use |
|---|---|
| `<button>` | Any interactive control that does not navigate |
| `<a href>` | Navigation to another page or route |
| `<nav aria-label="...">` | Landmark navigation regions |
| `<main>` | The primary content area (one per page) |
| `<section>` | Thematic groupings with a heading |
| `<h1>`–`<h3>` | Hierarchical headings (do not skip levels) |
| `<ul>` / `<li>` | Lists of items (task lists, nav items) |
| `<dialog>` / `role="dialog"` | Modal overlays |

### Task cards

Task cards use `role="article"` with a descriptive `aria-label`:

```tsx
<article
  role="article"
  aria-label="Buy groceries, P2 Important, due 5:00 PM, Personal"
  tabIndex={0}
>
```

Checkboxes inside cards use `role="checkbox"` and `aria-checked`.

---

## ARIA Patterns

### Dialogs (BottomSheet)

Every `<BottomSheet>` gets `role="dialog"`, `aria-modal="true"`, and a descriptive `aria-label`. The component automatically:
- Traps Tab focus within the dialog
- Restores focus to the trigger element on close
- Closes on `Escape`

### Live Regions

Use `role="status" aria-live="polite"` for non-urgent announcements (toasts, save confirmation).
Use `role="alert" aria-live="assertive"` only for errors that need immediate attention.

```tsx
// Correct toast pattern
<div role="status" aria-live="polite" aria-atomic="true">
  Task "Buy groceries" deleted. Undo available.
</div>
```

### Screen Reader-Only Text

Use `.sr-only` CSS class for text that provides context only to screen readers:

```tsx
<span className="task-card-icon" aria-hidden="true">🔁</span>
<span className="sr-only">Repeats weekly</span>
```

---

## Keyboard Navigation

### Global Shortcuts (when `keyboardShortcutsEnabled` is true)

| Key | Action |
|---|---|
| `n` | Open quick-add form (Day view) |
| `t` | Go to Today |
| `w` | Go to Week view |
| `m` | Go to Month view |
| `j` / `k` | Navigate tasks down/up |
| `Enter` | Open focused task detail |
| `x` | Toggle focused task complete |
| `Delete` | Delete focused task |
| `Escape` | Close modal / sheet |
| `?` | Show shortcut help overlay |

Shortcuts are **disabled by default**. Users enable them in Settings → Accessibility.

### Implementing New Shortcuts

Use the `useKeyboardShortcut` hook in `src/hooks/useKeyboardShortcut.ts`:

```ts
useKeyboardShortcut(
  'n',          // key
  callback,     // action (wrap in useCallback)
  enabled       // boolean — check settings.keyboardShortcutsEnabled
);
```

The hook automatically ignores shortcuts when the user is typing in an `<input>`, `<textarea>`, or `<select>`.

---

## Color and Contrast

### CSS Variables

All colors are defined as CSS variables in `src/styles/variables.css`. **Never use hardcoded hex values** in CSS or inline styles for anything that needs to work in high-contrast mode.

| Variable | Normal | High Contrast |
|---|---|---|
| `--color-p1` | `#EF4444` | `#DC2626` (5.2:1) |
| `--color-p2` | `#F59E0B` | `#D97706` (4.6:1) |
| `--color-p3` | `#3B82F6` | `#2563EB` (5.6:1) |
| `--color-text-primary` | `#1F2937` | `#000000` |

### Priority Colors in JSX

Use the CSS variable, not the hardcoded value from `PRIORITY_CONFIG`:

```tsx
// ✅ Correct — respects high-contrast overrides
style={{ color: `var(--color-${priority.toLowerCase()})` }}

// ❌ Wrong — bypasses high-contrast
style={{ color: config.color }}
```

### High-Contrast Mode

Toggled via `Settings → Accessibility → High contrast`. Applied as `data-high-contrast` on `<html>`. CSS overrides in `variables.css` handle:
- Darker priority colors
- Black borders
- Thicker focus ring (3px)
- Underlined links
- Category chips using border instead of colored background

---

## Focus Management

### Modals and Dialogs

When a modal/dialog opens:
1. Save the current `document.activeElement`
2. Move focus to the first focusable element inside the dialog
3. Trap Tab within the dialog
4. On close, restore focus to the saved element

`<BottomSheet>` does all of this automatically. If you build a new modal, follow the same pattern (see `KeyboardShortcutsHelp.tsx` for an example).

### Skip Link

The app shell includes a "Skip to main content" link that becomes visible on focus. Do not remove it.

```html
<a href="#main-content" className="skip-link">Skip to main content</a>
```

---

## Testing Checklist

Run these checks before submitting a PR that touches UI components:

### Automated
- [ ] Build passes (`npm run build`)
- [ ] No new axe-core violations (run in browser DevTools or via `axe` CLI)
- [ ] Color contrast verified with browser DevTools or WebAIM Contrast Checker

### Manual
- [ ] Tab through the feature with keyboard only — no mouse
- [ ] All interactive elements have a visible focus indicator
- [ ] No keyboard trap exists (Tab reaches outside any new modals)
- [ ] New icon-only buttons have `aria-label`
- [ ] Toasts and dynamic updates are announced (check with screen reader or `aria-live`)
- [ ] Feature works with font size at 130% (set in Settings → Accessibility)
- [ ] Feature works in high-contrast mode (set in Settings → Accessibility)
- [ ] No layout breaks at 320px viewport width

---

## Screen Reader Testing

| Screen Reader | Platform | How to activate |
|---|---|---|
| VoiceOver | macOS | Cmd + F5 |
| VoiceOver | iOS | Settings → Accessibility → VoiceOver |
| TalkBack | Android | Settings → Accessibility → TalkBack |
| NVDA | Windows | Download from nvaccess.org (free) |

Test all key flows: sign in, create task, complete task, delete task, navigate between views.

---

## Adding New Settings

When adding a new accessibility setting:

1. Add the field to `UserSettings` interface in `src/types/index.ts`
2. Add a default value to `DEFAULT_SETTINGS`
3. If it requires a DOM attribute, apply it in the `useEffect` in `src/contexts/SettingsContext.tsx`
4. Add the UI control in the Accessibility section of `src/components/views/SettingsView.tsx`
5. Document the CSS data-attribute in this guide

---

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe DevTools (Chrome Extension)](https://chromewebstore.google.com/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
