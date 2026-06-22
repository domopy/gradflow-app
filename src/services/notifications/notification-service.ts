import { Platform } from 'react-native';

import type { ScheduleItem } from '@/types/schedule';
import { isExpoGo } from '@/utils/runtime';
import { getReminderTarget } from '@/utils/reminders';

type NotificationsModule = typeof import('expo-notifications');

let handlerConfigured = false;

export type NotificationScheduleResult =
  | { ok: true; notificationId: string; remindAt: string }
  | {
      ok: false;
      reason: 'unsupported' | 'missing_time' | 'permission_denied' | 'past_time' | 'system_error';
      message: string;
    };

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
): Promise<NotificationScheduleResult> {
  try {
    const notifications = await loadNotifications();
    if (!notifications) {
      return {
        ok: false,
        reason: 'unsupported',
        message: isExpoGo()
          ? 'Expo Go不支持本地提醒，请使用Android Development Build或Release包。'
          : '当前平台不支持本地提醒。',
      };
    }
    const target = getReminderTarget(item);
    if (!target) {
      return { ok: false, reason: 'missing_time', message: '事项没有可用于提醒的时间。' };
    }
    if (!(await ensureNotificationPermission())) {
      return {
        ok: false,
        reason: 'permission_denied',
        message: '通知权限未开启，请在系统设置中允许研程发送通知。',
      };
    }

    const remindAt = new Date(target.getTime() - minutesBefore * 60_000);
    if (remindAt.getTime() <= Date.now()) {
      return {
        ok: false,
        reason: 'past_time',
        message: '提醒时间已经过去，请调整事项时间或提醒提前量。',
      };
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

    return { ok: true, notificationId, remindAt: remindAt.toISOString() };
  } catch (error) {
    // 权限、平台能力或系统调度失败不应阻止事项本身落库。
    return {
      ok: false,
      reason: 'system_error',
      message:
        error instanceof Error
          ? `系统提醒创建失败：${error.message}`
          : '系统提醒创建失败，请检查精确闹钟权限和后台运行设置。',
    };
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
