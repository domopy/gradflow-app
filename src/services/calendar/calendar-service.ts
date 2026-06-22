import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import type { ScheduleItem } from '@/types/schedule';
import { isExpoGo } from '@/utils/runtime';

export async function syncItemToSystemCalendar(
  item: ScheduleItem,
): Promise<{ eventId: string; action: 'created' | 'updated' }> {
  if (Platform.OS === 'web') {
    throw new Error('网页端不支持写入系统日历');
  }
  if (isExpoGo()) {
    throw new Error('Expo Go不支持写入系统日历，请使用Development Build或Release版本测试');
  }

  const permission = await Calendar.requestCalendarPermissions(false);
  if (!permission.granted) {
    throw new Error('未获得系统日历权限');
  }

  const startDate = item.startAt ? new Date(item.startAt) : item.dueAt ? new Date(item.dueAt) : null;
  if (!startDate) {
    throw new Error('事项没有可写入日历的时间');
  }

  const endDate = item.dueAt && item.startAt
    ? new Date(item.dueAt)
    : new Date(startDate.getTime() + 60 * 60_000);
  const details = {
    title: item.title,
    startDate,
    endDate: endDate > startDate ? endDate : new Date(startDate.getTime() + 60 * 60_000),
    location: item.location ?? undefined,
    notes: buildNotes(item),
    allDay: false,
  };

  if (item.calendarEventId) {
    try {
      const event = await Calendar.ExpoCalendarEvent.get(item.calendarEventId);
      await event.update(details);
      return { eventId: item.calendarEventId, action: 'updated' };
    } catch {
      // 用户可能已在系统日历中删除事件，此时重新创建并更新本地关联。
    }
  }

  const calendar = await getWritableAndroidCalendar();
  const event = await calendar.createEvent(details);
  return { eventId: event.id, action: 'created' };
}

export async function deleteSystemCalendarEvent(eventId: string): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo()) {
    return;
  }
  try {
    const event = await Calendar.ExpoCalendarEvent.get(eventId);
    await event.delete();
  } catch {
    // 系统事件已被用户删除时，本地清理仍保持幂等。
  }
}

async function getWritableAndroidCalendar(): Promise<Calendar.ExpoCalendar> {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((calendar) => calendar.allowsModifications);
  const calendar =
    writable.find((candidate) => candidate.isPrimary) ??
    writable.find((candidate) => candidate.ownerAccount) ??
    writable[0];
  if (!calendar) {
    throw new Error('没有找到可写入的系统日历，请先在手机日历中添加账户或日历');
  }
  return calendar;
}

function buildNotes(item: ScheduleItem): string {
  const lines = ['由研程创建'];
  if (item.course) {
    lines.push(`课程/项目：${item.course}`);
  }
  if (item.requirements.length) {
    lines.push(`要求：${item.requirements.join('；')}`);
  }
  if (item.submissionMethod) {
    lines.push(`提交方式：${item.submissionMethod}`);
  }
  return lines.join('\n');
}
