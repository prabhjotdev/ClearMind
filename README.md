# ClearMind

An ADHD-friendly task management Progressive Web App (PWA) that minimizes overwhelm, supports focus, and makes planning easier.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Routing**: React Router v7
- **Auth**: Firebase Auth (Google + Email/Password)
- **Database**: Cloud Firestore (offline-first)
- **PWA**: Installable, offline support via Firestore persistence
- **Styling**: CSS custom properties (design tokens)

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore and Auth enabled

### Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your Firebase config
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm start
   ```
5. Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

## Project Structure

```
src/
  components/
    auth/         Login, Signup, Reset Password pages
    common/       BottomSheet, FAB, Toast
    layout/       AppShell, Header, BottomNav, Sidebar
    tasks/        TaskCard, TaskForm, TaskDetail
    views/        DayView, WeekView, MonthView, SettingsView
  config/         Firebase configuration
  contexts/       AuthContext, ToastContext
  services/       Firestore CRUD (tasks, categories, settings)
  styles/         Global CSS, design tokens
  types/          TypeScript interfaces
docs/             Design documentation (PRD, UX, data model, etc.)
```

## Design Documentation

See the `docs/` folder for comprehensive design specs:

- `01-PRD.md` — Product requirements
- `02-UX-PRINCIPLES.md` — ADHD-specific UX guidelines
- `03-UI-DESIGN.md` — Wireframes and component specs
- `04-DATA-MODEL.md` — Firestore schema and indexes
- `05-REPEAT-AND-REMINDERS.md` — Repeat task and reminder logic
- `06-IMPORT-EXPORT.md` — JSON/CSV format specs
- `07-ACCESSIBILITY.md` — WCAG 2.1 AA checklist
- `08-MVP-PLAN.md` — Phased development plan

## License

MIT
