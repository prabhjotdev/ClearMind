# ClearMind — Import / Export Format Specification

## Overview

ClearMind supports exporting and importing tasks in two formats:
- **JSON** — Full fidelity, includes all fields, suitable for backup/restore
- **CSV** — Human-readable, spreadsheet-compatible, suitable for sharing/migration

---

## JSON Format

### Export Structure

```json
{
  "version": "1.0",
  "exportedAt": "2026-02-17T14:30:00.000Z",
  "exportedBy": "alex@email.com",
  "timezone": "America/New_York",
  "categories": [
    {
      "id": "cat_001",
      "name": "Work",
      "color": "#3B82F6",
      "icon": "💼",
      "order": 0
    },
    {
      "id": "cat_002",
      "name": "Personal",
      "color": "#8B5CF6",
      "icon": "🏠",
      "order": 1
    },
    {
      "id": "cat_003",
      "name": "Health",
      "color": "#10B981",
      "icon": "💪",
      "order": 2
    }
  ],
  "tasks": [
    {
      "id": "task_abc123",
      "name": "Submit tax documents",
      "description": "Gather W-2 forms and submit via TurboTax",
      "priority": "P1",
      "categoryId": "cat_001",
      "categoryName": "Work",
      "dueDate": "2026-02-17",
      "dueTime": "14:00",
      "repeat": "none",
      "repeatSeriesId": null,
      "status": "active",
      "completedAt": null,
      "reminders": [
        { "offsetMinutes": 15, "type": "both" },
        { "offsetMinutes": 60, "type": "push" }
      ],
      "createdAt": "2026-02-14T10:00:00.000Z",
      "updatedAt": "2026-02-16T08:30:00.000Z"
    },
    {
      "id": "task_def456",
      "name": "Take medication",
      "description": "",
      "priority": "P1",
      "categoryId": "cat_003",
      "categoryName": "Health",
      "dueDate": "2026-02-17",
      "dueTime": "09:00",
      "repeat": "daily",
      "repeatSeriesId": "task_def456",
      "status": "active",
      "completedAt": null,
      "reminders": [
        { "offsetMinutes": 0, "type": "push" }
      ],
      "createdAt": "2026-02-01T09:00:00.000Z",
      "updatedAt": "2026-02-01T09:00:00.000Z"
    },
    {
      "id": "task_ghi789",
      "name": "Grocery shopping",
      "description": "Milk, eggs, bread, chicken",
      "priority": "P2",
      "categoryId": "cat_002",
      "categoryName": "Personal",
      "dueDate": "2026-02-17",
      "dueTime": null,
      "repeat": "weekly",
      "repeatSeriesId": "task_ghi789",
      "status": "active",
      "completedAt": null,
      "reminders": [
        { "offsetMinutes": 60, "type": "in_app" }
      ],
      "createdAt": "2026-02-10T12:00:00.000Z",
      "updatedAt": "2026-02-10T12:00:00.000Z"
    },
    {
      "id": "task_jkl012",
      "name": "Organize desk",
      "description": "",
      "priority": "P3",
      "categoryId": "cat_002",
      "categoryName": "Personal",
      "dueDate": null,
      "dueTime": null,
      "repeat": "none",
      "repeatSeriesId": null,
      "status": "completed",
      "completedAt": "2026-02-15T16:45:00.000Z",
      "reminders": [],
      "createdAt": "2026-02-14T09:00:00.000Z",
      "updatedAt": "2026-02-15T16:45:00.000Z"
    }
  ],
  "settings": {
    "heatmapThresholdHigh": 5,
    "heatmapThresholdMedium": 3,
    "weekStartsOn": "monday"
  }
}
```

### JSON Import Rules

1. **Version check**: Only accept `version: "1.0"` (or compatible versions).
2. **Category matching**: On import, match categories by `name` (case-insensitive). If a category doesn't exist, create it.
3. **Duplicate detection**: Match tasks by `name` + `dueDate` + `categoryName`. If a match exists, prompt user:
   - "Skip duplicates" (default)
   - "Overwrite existing"
   - "Import as new"
4. **ID handling**: Imported task IDs are ignored. New Firestore document IDs are generated.
5. **Repeat series**: If a task has `repeat != 'none'`, re-generate instances using the rolling window strategy. Don't import individual repeat instances — only the series definition.
6. **Reminders**: Re-schedule reminders for imported tasks based on the `reminders` array.
7. **Settings**: Import settings only if the user confirms. Default: skip settings import.
8. **Validation**: Reject tasks missing `name` or with invalid `priority` values. Show count of skipped items.

---

## CSV Format

### Export Structure

```csv
Name,Description,Priority,Category,Due Date,Due Time,Repeat,Status,Completed At,Reminders,Created At
"Submit tax documents","Gather W-2 forms and submit via TurboTax",P1,Work,2026-02-17,14:00,none,active,,"15m before (both); 1h before (push)",2026-02-14T10:00:00Z
"Take medication","",P1,Health,2026-02-17,09:00,daily,active,,"at time (push)",2026-02-01T09:00:00Z
"Grocery shopping","Milk, eggs, bread, chicken",P2,Personal,2026-02-17,,weekly,active,,"1h before (in-app)",2026-02-10T12:00:00Z
"Organize desk","",P3,Personal,,,none,completed,2026-02-15T16:45:00Z,,2026-02-14T09:00:00Z
```

### CSV Column Specification

| Column | Required for Import | Format | Notes |
|---|---|---|---|
| Name | Yes | String (quoted if commas) | Max 200 chars |
| Description | No | String | Max 2000 chars |
| Priority | No | `P1`, `P2`, or `P3` | Default: `P3` |
| Category | Yes | String | Matched or created on import |
| Due Date | No | `YYYY-MM-DD` | Empty = no due date |
| Due Time | No | `HH:mm` (24h format) | Empty = all-day task |
| Repeat | No | `none`, `daily`, `weekly`, `monthly` | Default: `none` |
| Status | No | `active`, `completed` | Default: `active` |
| Completed At | No | ISO 8601 datetime | Only if status = completed |
| Reminders | No | Semicolon-separated list | Format: `{offset} ({type})` |
| Created At | No | ISO 8601 datetime | Default: import time |

### Reminder Format in CSV

Reminders are encoded as a semicolon-separated string:
```
15m before (both); 1h before (push); at time (in-app)
```

Offset labels for parsing:
| Label | `offsetMinutes` |
|---|---|
| `at time` | 0 |
| `5m before` | 5 |
| `15m before` | 15 |
| `30m before` | 30 |
| `1h before` | 60 |
| `1d before` | 1440 |

Type labels: `push`, `in-app`, `both`

### CSV Import Rules

1. **Header row**: Required. Column order can vary — matched by header name.
2. **Encoding**: UTF-8 with BOM supported.
3. **Quoting**: Standard CSV quoting (RFC 4180). Fields with commas, quotes, or newlines must be quoted.
4. **Category matching**: Same as JSON — match by name, create if missing.
5. **Duplicate detection**: Same as JSON — match by `Name` + `Due Date` + `Category`.
6. **Repeat tasks**: Same as JSON — only the series definition is imported, instances are generated.
7. **Error handling**: Skip rows with missing `Name` or invalid data. Show summary: "Imported 15 tasks, skipped 2 (missing name)."

---

## Import/Export UI Flow

### Export Flow
1. User navigates to Settings → Data → Export.
2. Selects format: JSON or CSV.
3. Selects scope:
   - "All tasks" (default)
   - "Active tasks only"
   - "Tasks from date range" (date picker for start/end)
4. Taps "Export".
5. File downloads as `clearmind-export-YYYY-MM-DD.json` or `.csv`.
6. Toast: "Exported {count} tasks."

### Import Flow
1. User navigates to Settings → Data → Import.
2. Taps "Import" → file picker opens (accepts `.json` and `.csv`).
3. App parses the file and shows a preview:
   ```
   Found 15 tasks in 3 categories.
   3 duplicates detected.

   Duplicates: [Skip] [Overwrite] [Import as new]

   [Cancel]  [Import]
   ```
4. On confirm, tasks are imported with a progress indicator.
5. Toast: "Imported 12 tasks, skipped 3 duplicates."

### File Size Limits
- Maximum import file size: **5 MB** (covers ~10,000 tasks in JSON).
- If file exceeds limit, show error: "File too large. Maximum 5 MB."

---

## Compatibility with Other Apps

### Importing from Todoist
Todoist exports CSV with columns: `TYPE`, `CONTENT`, `PRIORITY`, `INDENT`, `AUTHOR`, `RESPONSIBLE`, `DATE`, `DATE_LANG`, `TIMEZONE`.

Mapping:
| Todoist Column | ClearMind Column |
|---|---|
| CONTENT | Name |
| PRIORITY | Priority (Todoist 4→P1, 3→P2, 2/1→P3) |
| DATE | Due Date + Due Time (parse the date string) |
| (not available) | Category → default to "Imported" |

### Importing from Google Tasks
Google Tasks export (via Google Takeout) is JSON with `title`, `notes`, `due`, `status`.

Mapping:
| Google Tasks | ClearMind |
|---|---|
| title | Name |
| notes | Description |
| due | Due Date (no time in Google Tasks) |
| status → "completed" | Status = completed |
| (not available) | Priority → P3, Category → "Imported" |

ClearMind auto-detects the format on import by checking for known headers/keys.
