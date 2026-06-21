import { Platform } from 'react-native';

import type { ScheduleItem } from '@/types/schedule';
import { isExpoGo } from '@/utils/runtime';
import { getReminderTarget } from '@/utils/reminders';

type NotificationsModule = typeof import('expo-notifications');

let handlerConfigured = false;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web' || isExpoGo()) {
    return null;
  }
  const notifications = await import('expo-notifications');
  if (!handlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }
  return notifications;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const notifications = await loadNotifications();
  if (!notifications) {
    return false;
  }

  const current = await notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleItemNotification(
  item: ScheduleItem,
  minutesBefore: number,
): Promise<{ notificationId: string; remindAt: string } | null> {
  try {
    const notifications = await loadNotifications();
    if (!notifications) {
      return null;
    }
    const target = getReminderTarget(item);
    if (!target || !(await ensureNotificationPermission())) {
      return null;
    }

    const remindAt = new Date(target.getTime() - minutesBefore * 60_000);
    if (remindAt.getTime() <= Date.now()) {
      return null;
    }

    if (Platform.OS === 'android') {
      await notifications.setNotificationChannelAsync('schedule-reminders', {
        name: '日程提醒',
        importance: notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
      });
    }

    const notificationId = await notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: buildNotificationBody(item, minutesBefore),
        data: { itemId: item.id },
        sound: true,
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: remindAt,
        channelId: Platform.OS === 'android' ? 'schedule-reminders' : undefined,
      },
    });

    return { notificationId, remindAt: remindAt.toISOString() };
  } catch {
    // 权限、平台能力或系统调度失败不应阻止事项本身落库。
    return null;
  }
}

function buildNotificationBody(item: ScheduleItem, minutesBefore: number): string {
  const lead =
    minutesBefore >= 1440
      ? `${Math.round(minutesBefore / 1440)}天后`
      : minutesBefore >= 60
        ? `${Math.round(minutesBefore / 60)}小时后`
        : `${minutesBefore}分钟后`;
  return item.location ? `${lead} · ${item.location}` : lead;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  const notifications = await loadNotifications();
  if (notifications) {
    await notifications.cancelScheduledNotificationAsync(notificationId);
  }
}
