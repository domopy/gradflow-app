import type { ScheduleItem } from '@/types/schedule';

import { addDays, itemDate, startOfDay } from './date';

export interface TodayGroups {
  today: ScheduleItem[];
  nextThreeDays: ScheduleItem[];
  thisWeek: ScheduleItem[];
  later: ScheduleItem[];
}

export function groupUpcomingItems(items: ScheduleItem[], now = new Date()): TodayGroups {
  const today = startOfDay(now).getTime();
  const tomorrow = addDays(startOfDay(now), 1).getTime();
  const inThreeDays = addDays(startOfDay(now), 4).getTime();
  const inSevenDays = addDays(startOfDay(now), 8).getTime();
  const groups: TodayGroups = { today: [], nextThreeDays: [], thisWeek: [], later: [] };

  for (const item of items) {
    if (item.status === 'cancelled') {
      continue;
    }

    const date = itemDate(item);
    if (!date) {
      groups.later.push(item);
      continue;
    }

    const value = date.getTime();
    if (value >= today && value < tomorrow) {
      groups.today.push(item);
    } else if (value >= tomorrow && value < inThreeDays) {
      groups.nextThreeDays.push(item);
    } else if (value >= inThreeDays && value < inSevenDays) {
      groups.thisWeek.push(item);
    } else {
      groups.later.push(item);
    }
  }

  return groups;
}
