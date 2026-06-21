import type { ScheduleItem } from '@/types/schedule';

export interface ScheduleConflict {
  firstId: string;
  secondId: string;
  overlapMinutes: number;
}

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function getInterval(item: ScheduleItem): [number, number] | null {
  if (!item.startAt || item.status === 'cancelled' || item.status === 'completed') {
    return null;
  }
  const start = new Date(item.startAt).getTime();
  const explicitEnd = item.dueAt ? new Date(item.dueAt).getTime() : Number.NaN;
  const isBoundedEvent =
    item.type !== 'assignment' &&
    Number.isFinite(explicitEnd) &&
    explicitEnd > start &&
    explicitEnd - start <= 12 * 60 * 60 * 1000;
  const end = isBoundedEvent
    ? explicitEnd
    : start + DEFAULT_DURATION_MS;
  return [start, end];
}

export function findScheduleConflicts(items: ScheduleItem[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (let firstIndex = 0; firstIndex < items.length; firstIndex += 1) {
    const first = items[firstIndex];
    const firstInterval = getInterval(first);
    if (!firstInterval) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < items.length; secondIndex += 1) {
      const second = items[secondIndex];
      const secondInterval = getInterval(second);
      if (!secondInterval) continue;
      const overlap = Math.min(firstInterval[1], secondInterval[1]) -
        Math.max(firstInterval[0], secondInterval[0]);
      if (overlap > 0) {
        conflicts.push({
          firstId: first.id,
          secondId: second.id,
          overlapMinutes: Math.ceil(overlap / 60_000),
        });
      }
    }
  }
  return conflicts;
}

export function conflictIds(items: ScheduleItem[]): Set<string> {
  const ids = new Set<string>();
  for (const conflict of findScheduleConflicts(items)) {
    ids.add(conflict.firstId);
    ids.add(conflict.secondId);
  }
  return ids;
}
