// ClearMind Type Definitions

import { Timestamp } from 'firebase/firestore';

// ─── Task ────────────────────────────────────────────────────

export type Priority = 'P1' | 'P2' | 'P3';
export type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskStatus = 'active' | 'completed' | 'deleted';

export interface Task {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  categoryId: string;
  dueDate: Timestamp | null;
  dueTime: string | null; // "HH:mm" local time
  repeat: RepeatMode;
  repeatSeriesId: string | null;
  repeatOriginalDate: Timestamp | null;
  status: TaskStatus;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export type TaskFormData = {
  name: string;
  description: string;
  priority: Priority;
  categoryId: string;
  dueDate: Date | null;
  dueTime: string | null;
  repeat: RepeatMode;
  reminders: ReminderOffset[];
};

// ─── Category ────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  isDefault: boolean;
  createdAt: Timestamp;
}

// ─── Reminder ────────────────────────────────────────────────

export type ReminderStatus = 'scheduled' | 'sent' | 'snoozed' | 'dismissed' | 'cancelled';
export type ReminderType = 'push' | 'in_app' | 'both';

export interface Reminder {
  id: string;
  taskId: string;
  taskName: string;
  scheduledAt: Timestamp;
  offsetMinutes: number;
  status: ReminderStatus;
  snoozedUntil: Timestamp | null;
  snoozeCount: number;
  type: ReminderType;
  sentAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface ReminderOffset {
  offsetMinutes: number;
  type: ReminderType;
}

// ─── User ────────────────────────────────────────────────────

export type AuthProvider = 'google' | 'email';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  authProvider: AuthProvider;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  onboardingCompleted: boolean;
  timezone: string;
}

// ─── Settings ────────────────────────────────────────────────

export type WeekStartDay = 'monday' | 'sunday';
export type ReminderSound = 'default' | 'gentle' | 'none';

export interface UserSettings {
  pushNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string; // "HH:mm"
  reminderSound: ReminderSound;
  fontSize: number;
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderMode: boolean;
  keyboardShortcutsEnabled: boolean;
  heatmapThresholdHigh: number;
  heatmapThresholdMedium: number;
  weekStartsOn: WeekStartDay;
  fcmToken: string | null;
  lastSyncAt: Timestamp;
}

// ─── Emergency Fund ──────────────────────────────────────────

export interface EmergencyFundTransaction {
  id: string;
  description: string;
  amount: number; // positive = deposit, negative = withdrawal
  date: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

export type EmergencyFundTransactionFormData = {
  description: string;
  amount: number;
  date: Date;
};

// ─── UI Helpers ──────────────────────────────────────────────

export interface PriorityConfig {
  label: string;
  shortLabel: string;
  color: string;
  highContrastColor: string;
}

export const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  P1: {
    label: 'P1 — Urgent',
    shortLabel: 'P1',
    color: '#EF4444',
    highContrastColor: '#DC2626',
  },
  P2: {
    label: 'P2 — Important',
    shortLabel: 'P2',
    color: '#F59E0B',
    highContrastColor: '#D97706',
  },
  P3: {
    label: 'P3 — Low',
    shortLabel: 'P3',
    color: '#3B82F6',
    highContrastColor: '#2563EB',
  },
};

export const DEFAULT_SETTINGS: UserSettings = {
  pushNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  dailyDigestEnabled: false,
  dailyDigestTime: '08:00',
  reminderSound: 'default',
  fontSize: 100,
  reducedMotion: false,
  highContrast: false,
  screenReaderMode: false,
  keyboardShortcutsEnabled: false,
  heatmapThresholdHigh: 5,
  heatmapThresholdMedium: 3,
  weekStartsOn: 'monday',
  fcmToken: null,
  lastSyncAt: Timestamp.now(),
};

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'Work', color: '#3B82F6', icon: '💼', order: 0, isDefault: true },
  { name: 'Personal', color: '#8B5CF6', icon: '🏠', order: 1, isDefault: true },
  { name: 'Health', color: '#10B981', icon: '💪', order: 2, isDefault: true },
];
