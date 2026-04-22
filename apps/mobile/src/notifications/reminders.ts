import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const HABIT_REMINDER_CATEGORY = 'HABIT_REMINDER';
const GOAL_REMINDER_CATEGORY  = 'GOAL_REMINDER';

// ── Configure notification handler ───────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Request permissions ───────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true },
  });
  return status === 'granted';
}

// ── Schedule a daily habit reminder ──────────────────────────────────────────
export async function scheduleHabitReminder(habitId: string, habitName: string, timeStr: string): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  // Cancel any existing reminder for this habit
  await cancelHabitReminder(habitId);

  const [hours, minutes] = timeStr.split(':').map(Number);

  const id = await Notifications.scheduleNotificationAsync({
    identifier: `habit_${habitId}`,
    content: {
      title: '⚡ Habit Reminder',
      body: `Time for "${habitName}"`,
      data: { type: 'habit', habitId },
      categoryIdentifier: HABIT_REMINDER_CATEGORY,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    },
  });

  return id;
}

// ── Cancel a habit reminder ───────────────────────────────────────────────────
export async function cancelHabitReminder(habitId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`habit_${habitId}`);
}

// ── Schedule a one-time goal reminder ────────────────────────────────────────
export async function scheduleGoalReminder(
  goalId: string,
  goalTitle: string,
  dateStr: string,
  timeStr = '09:00'
): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  await cancelGoalReminder(goalId);

  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes]   = timeStr.split(':').map(Number);
  const triggerDate = new Date(year, month - 1, day, hours, minutes, 0);

  if (triggerDate <= new Date()) return null; // Past date — skip

  const id = await Notifications.scheduleNotificationAsync({
    identifier: `goal_${goalId}`,
    content: {
      title: '🎯 Goal Reminder',
      body: `Don't forget: "${goalTitle}"`,
      data: { type: 'goal', goalId },
      categoryIdentifier: GOAL_REMINDER_CATEGORY,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

// ── Cancel a goal reminder ────────────────────────────────────────────────────
export async function cancelGoalReminder(goalId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`goal_${goalId}`);
}

// ── Cancel ALL reminders ──────────────────────────────────────────────────────
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── List all scheduled notifications (for debug) ─────────────────────────────
export async function listScheduledReminders() {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ── Handle notification tap (navigate in app) ─────────────────────────────────
export function useNotificationNavigation(router: { push: (path: string) => void }) {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { type?: string; habitId?: string; goalId?: string };
    if (data.type === 'habit') router.push('/(tabs)/habits');
    if (data.type === 'goal')  router.push('/(tabs)/goals');
  });
}
