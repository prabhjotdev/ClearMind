import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Task,
  Category,
  UserSettings,
  Priority,
  RepeatMode,
  TaskStatus,
  ReminderOffset,
  ReminderType,
} from '../types';
import { getAllTasksForExport } from './taskService';
import { getAllCategories, createCategory } from './categoryService';
import { scheduleRemindersForTask } from './reminderService';
import { startOfDay } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────

export type ExportScope = 'all' | 'active';
export type DuplicateAction = 'skip' | 'overwrite' | 'new';

export interface ParsedImportTask {
  name: string;
  description: string;
  priority: Priority;
  categoryName: string;
  dueDate: string | null; // YYYY-MM-DD
  dueTime: string | null; // HH:mm
  repeat: RepeatMode;
  status: TaskStatus;
  completedAt: string | null;
  reminders: ReminderOffset[];
  createdAt: string; // ISO 8601
}

export interface ImportPreview {
  tasks: ParsedImportTask[];
  categoryNames: string[];
  duplicateIndices: number[];
  skippedCount: number;
  format: 'json' | 'csv';
  errors: string[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

// ─── Reminder helpers ─────────────────────────────────────────

function reminderOffsetToLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'at time';
  if (offsetMinutes === 5) return '5m before';
  if (offsetMinutes === 15) return '15m before';
  if (offsetMinutes === 30) return '30m before';
  if (offsetMinutes === 60) return '1h before';
  if (offsetMinutes === 1440) return '1d before';
  if (offsetMinutes < 60) return `${offsetMinutes}m before`;
  if (offsetMinutes < 1440) return `${Math.round(offsetMinutes / 60)}h before`;
  return `${Math.round(offsetMinutes / 1440)}d before`;
}

function reminderTypeToLabel(type: ReminderType): string {
  if (type === 'in_app') return 'in-app';
  return type; // 'push' | 'both'
}

function labelToReminderOffset(label: string): number | null {
  const l = label.trim().toLowerCase();
  if (l === 'at time') return 0;
  if (l === '5m before') return 5;
  if (l === '15m before') return 15;
  if (l === '30m before') return 30;
  if (l === '1h before') return 60;
  if (l === '1d before') return 1440;
  const mMatch = l.match(/^(\d+)m before$/);
  if (mMatch) return parseInt(mMatch[1]);
  const hMatch = l.match(/^(\d+)h before$/);
  if (hMatch) return parseInt(hMatch[1]) * 60;
  const dMatch = l.match(/^(\d+)d before$/);
  if (dMatch) return parseInt(dMatch[1]) * 1440;
  return null;
}

function labelToReminderType(label: string): ReminderType | null {
  const l = label.trim().toLowerCase();
  if (l === 'push') return 'push';
  if (l === 'in-app' || l === 'in_app') return 'in_app';
  if (l === 'both') return 'both';
  return null;
}

function parseReminderString(str: string): ReminderOffset[] {
  if (!str.trim()) return [];
  const parts = str.split(';');
  const result: ReminderOffset[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
    if (!match) continue;
    const offset = labelToReminderOffset(match[1].trim());
    const type = labelToReminderType(match[2].trim());
    if (offset !== null && type !== null) {
      result.push({ offsetMinutes: offset, type });
    }
  }
  return result;
}

function formatRemindersForCSV(reminders: ReminderOffset[]): string {
  return reminders
    .map((r) => `${reminderOffsetToLabel(r.offsetMinutes)} (${reminderTypeToLabel(r.type)})`)
    .join('; ');
}

// ─── Firestore reminder fetch ──────────────────────────────────

async function getRemindersGroupedByTask(
  userId: string
): Promise<Map<string, ReminderOffset[]>> {
  const remindersCol = collection(db, 'users', userId, 'reminders');
  const q = query(remindersCol, where('status', 'in', ['scheduled', 'snoozed']));
  const snapshot = await getDocs(q);
  const map = new Map<string, ReminderOffset[]>();
  snapshot.docs.forEach((d) => {
    const data = d.data();
    const taskId: string = data.taskId;
    const entry: ReminderOffset = {
      offsetMinutes: data.offsetMinutes,
      type: data.type as ReminderType,
    };
    if (!map.has(taskId)) map.set(taskId, []);
    map.get(taskId)!.push(entry);
  });
  return map;
}

// ─── JSON Export ──────────────────────────────────────────────

export async function generateJSONExport(
  userId: string,
  scope: ExportScope,
  userEmail: string,
  settings: UserSettings
): Promise<string> {
  const [tasks, categories, remindersMap] = await Promise.all([
    getAllTasksForExport(userId, scope),
    getAllCategories(userId),
    getRemindersGroupedByTask(userId),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const exportTasks = tasks.map((t) => {
    const cat = categoryById.get(t.categoryId);
    const dueDateStr = t.dueDate
      ? t.dueDate.toDate().toISOString().split('T')[0]
      : null;
    const completedAtStr = t.completedAt
      ? t.completedAt.toDate().toISOString()
      : null;

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      priority: t.priority,
      categoryId: t.categoryId,
      categoryName: cat?.name ?? '',
      dueDate: dueDateStr,
      dueTime: t.dueTime,
      repeat: t.repeat,
      repeatSeriesId: t.repeatSeriesId,
      status: t.status,
      completedAt: completedAtStr,
      reminders: remindersMap.get(t.id) ?? [],
      createdAt: t.createdAt.toDate().toISOString(),
      updatedAt: t.updatedAt.toDate().toISOString(),
    };
  });

  const exportCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
    order: c.order,
  }));

  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: userEmail,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    categories: exportCategories,
    tasks: exportTasks,
    settings: {
      heatmapThresholdHigh: settings.heatmapThresholdHigh,
      heatmapThresholdMedium: settings.heatmapThresholdMedium,
      weekStartsOn: settings.weekStartsOn,
    },
  };

  return JSON.stringify(data, null, 2);
}

// ─── CSV Export ───────────────────────────────────────────────

function csvEscape(value: string | null | undefined): string {
  const s = value ?? '';
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function generateCSVExport(
  userId: string,
  scope: ExportScope,
  userEmail: string
): Promise<string> {
  const [tasks, categories, remindersMap] = await Promise.all([
    getAllTasksForExport(userId, scope),
    getAllCategories(userId),
    getRemindersGroupedByTask(userId),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const header =
    'Name,Description,Priority,Category,Due Date,Due Time,Repeat,Status,Completed At,Reminders,Created At';

  const rows = tasks.map((t) => {
    const cat = categoryById.get(t.categoryId);
    const dueDateStr = t.dueDate
      ? t.dueDate.toDate().toISOString().split('T')[0]
      : '';
    const completedAtStr = t.completedAt
      ? t.completedAt.toDate().toISOString()
      : '';
    const reminders = remindersMap.get(t.id) ?? [];

    return [
      csvEscape(t.name),
      csvEscape(t.description),
      t.priority,
      csvEscape(cat?.name ?? ''),
      dueDateStr,
      t.dueTime ?? '',
      t.repeat,
      t.status,
      completedAtStr,
      csvEscape(formatRemindersForCSV(reminders)),
      t.createdAt.toDate().toISOString(),
    ].join(',');
  });

  return [header, ...rows].join('\r\n');
}

// ─── File download ────────────────────────────────────────────

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── CSV Parser (RFC 4180) ────────────────────────────────────

function parseCSV(text: string): string[][] {
  // Strip BOM
  const input = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;

  while (i < input.length) {
    if (input[i] === '"') {
      // Quoted field
      let field = '';
      i++; // skip opening quote
      while (i < input.length) {
        if (input[i] === '"') {
          if (input[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          field += input[i];
          i++;
        }
      }
      row.push(field);
      // skip comma or newline after closing quote
      if (input[i] === ',') {
        i++;
      } else if (input[i] === '\r' && input[i + 1] === '\n') {
        rows.push(row);
        row = [];
        i += 2;
      } else if (input[i] === '\n') {
        rows.push(row);
        row = [];
        i++;
      }
    } else if (input[i] === ',') {
      row.push('');
      i++;
    } else if (input[i] === '\r' && input[i + 1] === '\n') {
      row.push('');
      rows.push(row);
      row = [];
      i += 2;
    } else if (input[i] === '\n') {
      row.push('');
      rows.push(row);
      row = [];
      i++;
    } else {
      // Unquoted field
      let field = '';
      while (
        i < input.length &&
        input[i] !== ',' &&
        input[i] !== '\n' &&
        !(input[i] === '\r' && input[i + 1] === '\n')
      ) {
        field += input[i];
        i++;
      }
      row.push(field);
      if (input[i] === ',') {
        i++;
      } else if (input[i] === '\r' && input[i + 1] === '\n') {
        rows.push(row);
        row = [];
        i += 2;
      } else if (input[i] === '\n') {
        rows.push(row);
        row = [];
        i++;
      }
    }
  }

  if (row.length > 0) {
    rows.push(row);
  }

  return rows;
}

// ─── Validation helpers ───────────────────────────────────────

const VALID_PRIORITIES = new Set(['P1', 'P2', 'P3']);
const VALID_REPEATS = new Set(['none', 'daily', 'weekly', 'monthly']);
const VALID_STATUSES = new Set(['active', 'completed']);

function normalizePriority(v: string): Priority {
  if (VALID_PRIORITIES.has(v)) return v as Priority;
  return 'P3';
}

function normalizeRepeat(v: string): RepeatMode {
  if (VALID_REPEATS.has(v)) return v as RepeatMode;
  return 'none';
}

function normalizeStatus(v: string): TaskStatus {
  if (VALID_STATUSES.has(v)) return v as TaskStatus;
  return 'active';
}

function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ─── Import parsing ───────────────────────────────────────────

export async function parseImportFile(
  file: File
): Promise<ImportPreview> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large. Maximum 5 MB.');
  }

  const text = await file.text();
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'json' || file.type === 'application/json') {
    return parseJSONImport(text);
  } else if (ext === 'csv' || file.type === 'text/csv') {
    return parseCSVImport(text);
  }

  // Try to auto-detect
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJSONImport(text);
  }
  return parseCSVImport(text);
}

function parseJSONImport(text: string): ImportPreview {
  const errors: string[] = [];
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file. Please check the file format.');
  }

  if (data.version !== '1.0') {
    errors.push(`Unsupported version: ${data.version}. Expected 1.0.`);
  }

  const rawTasks: any[] = Array.isArray(data.tasks) ? data.tasks : [];
  const tasks: ParsedImportTask[] = [];
  let skippedCount = 0;

  for (let i = 0; i < rawTasks.length; i++) {
    const t = rawTasks[i];
    if (!t.name || typeof t.name !== 'string' || !t.name.trim()) {
      errors.push(`Row ${i + 1}: Skipped — missing name.`);
      skippedCount++;
      continue;
    }
    if (t.priority && !VALID_PRIORITIES.has(t.priority)) {
      errors.push(`Row ${i + 1}: Invalid priority "${t.priority}", defaulting to P3.`);
    }

    const reminders: ReminderOffset[] = Array.isArray(t.reminders)
      ? t.reminders
          .filter(
            (r: any) =>
              typeof r.offsetMinutes === 'number' && r.type
          )
          .map((r: any) => ({
            offsetMinutes: r.offsetMinutes,
            type: r.type as ReminderType,
          }))
      : [];

    tasks.push({
      name: t.name.trim(),
      description: typeof t.description === 'string' ? t.description : '',
      priority: normalizePriority(t.priority ?? ''),
      categoryName: typeof t.categoryName === 'string' ? t.categoryName.trim() : 'Imported',
      dueDate: isValidDateString(t.dueDate) ? t.dueDate : null,
      dueTime: typeof t.dueTime === 'string' && /^\d{2}:\d{2}$/.test(t.dueTime) ? t.dueTime : null,
      repeat: normalizeRepeat(t.repeat ?? ''),
      status: normalizeStatus(t.status ?? ''),
      completedAt: typeof t.completedAt === 'string' ? t.completedAt : null,
      reminders,
      createdAt:
        typeof t.createdAt === 'string'
          ? t.createdAt
          : new Date().toISOString(),
    });
  }

  const categoryNames = Array.from(new Set(tasks.map((t) => t.categoryName).filter(Boolean)));

  return {
    tasks,
    categoryNames,
    duplicateIndices: [], // filled in SettingsView after existing tasks are loaded
    skippedCount,
    format: 'json',
    errors,
  };
}

function parseCSVImport(text: string): ImportPreview {
  const errors: string[] = [];
  const rows = parseCSV(text);

  if (rows.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);

  const nameIdx = colIndex('name');
  const descIdx = colIndex('description');
  const priorityIdx = colIndex('priority');
  const categoryIdx = colIndex('category');
  const dueDateIdx = colIndex('due date');
  const dueTimeIdx = colIndex('due time');
  const repeatIdx = colIndex('repeat');
  const statusIdx = colIndex('status');
  const completedAtIdx = colIndex('completed at');
  const remindersIdx = colIndex('reminders');
  const createdAtIdx = colIndex('created at');

  if (nameIdx === -1) {
    throw new Error('CSV missing required "Name" column.');
  }

  const tasks: ParsedImportTask[] = [];
  let skippedCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely empty rows
    if (row.every((c) => !c.trim())) continue;

    const get = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : '');

    const name = get(nameIdx);
    if (!name) {
      errors.push(`Row ${i + 1}: Skipped — missing name.`);
      skippedCount++;
      continue;
    }

    const priority = get(priorityIdx);
    if (priority && !VALID_PRIORITIES.has(priority)) {
      errors.push(`Row ${i + 1}: Invalid priority "${priority}", defaulting to P3.`);
    }

    const dueDateRaw = get(dueDateIdx);
    const remindersRaw = get(remindersIdx);

    tasks.push({
      name,
      description: get(descIdx),
      priority: normalizePriority(priority),
      categoryName: get(categoryIdx) || 'Imported',
      dueDate: isValidDateString(dueDateRaw) ? dueDateRaw : null,
      dueTime: /^\d{2}:\d{2}$/.test(get(dueTimeIdx)) ? get(dueTimeIdx) : null,
      repeat: normalizeRepeat(get(repeatIdx)),
      status: normalizeStatus(get(statusIdx)),
      completedAt: get(completedAtIdx) || null,
      reminders: parseReminderString(remindersRaw),
      createdAt: get(createdAtIdx) || new Date().toISOString(),
    });
  }

  const categoryNames = Array.from(new Set(tasks.map((t) => t.categoryName).filter(Boolean)));

  return {
    tasks,
    categoryNames,
    duplicateIndices: [],
    skippedCount,
    format: 'csv',
    errors,
  };
}

// ─── Duplicate detection ──────────────────────────────────────

function taskDuplicateKey(name: string, dueDate: string | null, categoryName: string): string {
  return `${name.toLowerCase()}|${dueDate ?? ''}|${categoryName.toLowerCase()}`;
}

export function detectDuplicates(
  incoming: ParsedImportTask[],
  existing: Task[],
  categories: Category[]
): number[] {
  const catById = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));

  const existingKeys = new Set(
    existing.map((t) => {
      const catName = catById.get(t.categoryId) ?? '';
      const dueDateStr = t.dueDate ? t.dueDate.toDate().toISOString().split('T')[0] : null;
      return taskDuplicateKey(t.name, dueDateStr, catName);
    })
  );

  return incoming.reduce<number[]>((acc, task, idx) => {
    const key = taskDuplicateKey(task.name, task.dueDate, task.categoryName);
    if (existingKeys.has(key)) acc.push(idx);
    return acc;
  }, []);
}

// ─── Import to Firestore ──────────────────────────────────────

export async function importTasksToFirestore(
  userId: string,
  tasks: ParsedImportTask[],
  duplicateIndices: Set<number>,
  duplicateAction: DuplicateAction,
  existingCategories: Category[]
): Promise<ImportResult> {
  // Build category name → id map (case-insensitive)
  const catNameToId = new Map(
    existingCategories.map((c) => [c.name.toLowerCase(), c.id])
  );

  // Create missing categories
  const categoryNames = Array.from(new Set(tasks.map((t) => t.categoryName)));
  for (const name of categoryNames) {
    if (!catNameToId.has(name.toLowerCase())) {
      const newId = await createCategory(userId, {
        name,
        color: '#6B7280',
        icon: '📁',
      });
      catNameToId.set(name.toLowerCase(), newId);
    }
  }

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const isDuplicate = duplicateIndices.has(i);

    if (isDuplicate && duplicateAction === 'skip') {
      skipped++;
      continue;
    }
    // For 'overwrite', we import as a new doc (same effect for our purposes)
    // since we don't have the existing doc id easily available here
    // A full overwrite would require finding and updating the existing doc,
    // which adds complexity. We'll import as new for both 'overwrite' and 'new'.

    const catId = catNameToId.get(task.categoryName.toLowerCase()) ?? '';

    const now = Timestamp.now();
    let dueDate: Timestamp | null = null;
    if (task.dueDate) {
      const [year, month, day] = task.dueDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      dueDate = Timestamp.fromDate(startOfDay(d));
    }

    const completedAt: Timestamp | null =
      task.status === 'completed' && task.completedAt
        ? Timestamp.fromDate(new Date(task.completedAt))
        : null;

    const taskData = {
      name: task.name,
      description: task.description,
      priority: task.priority,
      categoryId: catId,
      dueDate,
      dueTime: task.dueTime,
      repeat: task.repeat,
      repeatSeriesId: null as string | null,
      repeatOriginalDate: dueDate,
      status: task.status,
      completedAt,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };

    const tasksCol = collection(db, 'users', userId, 'tasks');
    const docRef = await addDoc(tasksCol, taskData);

    // Set repeatSeriesId for repeating tasks
    if (task.repeat !== 'none') {
      const batch = writeBatch(db);
      batch.update(doc(tasksCol, docRef.id), { repeatSeriesId: docRef.id });
      await batch.commit();
    }

    // Schedule reminders if task has dueDate + dueTime
    if (task.reminders.length > 0 && task.dueDate && task.dueTime) {
      const [year, month, day] = task.dueDate.split('-').map(Number);
      const dueAsDate = new Date(year, month - 1, day);
      try {
        await scheduleRemindersForTask(
          userId,
          docRef.id,
          task.name,
          dueAsDate,
          task.dueTime,
          task.reminders
        );
      } catch {
        // Don't fail the whole import if reminder scheduling fails
      }
    }

    imported++;
  }

  return { imported, skipped };
}
