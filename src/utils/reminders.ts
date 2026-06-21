import type { ChangeType, ScheduleItem } from '@/types/schedule';

export function getReminderTarget(item: ScheduleItem): Date | null {
  // 日程提醒默认针对开始时间；只有没有开始时间的截止事项才使用截止时间。
  const target = item.startAt ?? item.dueAt;
  return target ? new Date(target) : null;
}

export function resolveChangedReminderMinutes(
  changeType: ChangeType,
  requestedMinutes: number | null | undefined,
  previousMinutes: number | undefined,
): number | null | undefined {
  if (changeType === 'cancelled') return null;
  return requestedMinutes === undefined ? previousMinutes : requestedMinutes;
}
