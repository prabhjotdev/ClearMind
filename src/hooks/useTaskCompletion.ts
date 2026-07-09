import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { completeTask, uncompleteTask } from '../services/taskService';
import { cancelRemindersForTask } from '../services/reminderService';
import {
  awardForTaskCompletion,
  reverseAwardForTaskCompletion,
  AwardResult,
} from '../services/gamificationService';
import { Task } from '../types';

// Shared by DayView and WeekView so gamification stays a thin add-on to the
// existing complete/undo flow rather than being duplicated across views.
export function useTaskCompletion(onLevelUp?: (result: AwardResult) => void) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const userId = currentUser?.uid;

  const handleTaskComplete = useCallback(
    async (task: Task) => {
      if (!userId) return;

      if (task.status === 'completed') {
        await uncompleteTask(userId, task.id);
        showToast(`"${task.name}" restored`);
        return;
      }

      await completeTask(userId, task.id);
      await cancelRemindersForTask(userId, task.id);

      if (settings.gamificationEnabled) {
        const award = await awardForTaskCompletion(userId, task);
        if (award.leveledUp) onLevelUp?.(award);
      }

      showToast(`"${task.name}" completed`, async () => {
        await uncompleteTask(userId, task.id);
        if (settings.gamificationEnabled) {
          await reverseAwardForTaskCompletion(userId, task);
        }
      });
    },
    [userId, settings.gamificationEnabled, showToast, onLevelUp]
  );

  return { handleTaskComplete };
}
