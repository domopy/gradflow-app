import type { ScheduleItem } from '@/types/schedule';

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function itemDate(item: ScheduleItem): Date | null {
  const value = item.startAt ?? item.dueAt;
  return value ? new Date(value) : null;
}

export function itemDateKey(item: ScheduleItem): string | null {
  const date = itemDate(item);
  return date ? toDateKey(date) : null;
}

export function formatDayHeading(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | null): string {
  return value ? dateTimeFormatter.format(new Date(value)) : '待确认';
}

export function formatDateTimeInput(value: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function parseDateTimeInput(value: string): string | null {
  const match = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  // Date会自动进位，因此需要反向核对以拒绝“2月31日”等无效输入。
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date.toISOString();
}

export function dateTimeInputToDate(value: string, fallback = new Date()): Date {
  const parsed = parseDateTimeInput(value);
  return parsed ? new Date(parsed) : new Date(fallback);
}

export function mergeDateTimeSelection(
  current: Date,
  selected: Date,
  mode: 'date' | 'time',
): Date {
  const merged = new Date(current);
  if (mode === 'date') {
    merged.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );
  } else {
    merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  }
  return merged;
}

export function commitDateTimeSelection(
  currentValue: string,
  draft: Date,
  confirmed: boolean,
): string {
  // 取消选择时必须原样保留文本，包括尚未完成的手动输入。
  return confirmed ? formatDateTimeInput(draft.toISOString()) : currentValue;
}

export function isOverdue(item: ScheduleItem, now = new Date()): boolean {
  if (item.status === 'completed' || item.status === 'cancelled') {
    return false;
  }
  const target = item.dueAt ?? item.startAt;
  return Boolean(target && new Date(target).getTime() < now.getTime());
}

export function itemsForDate(items: ScheduleItem[], date: Date): ScheduleItem[] {
  const key = toDateKey(date);
  return items.filter((item) => itemDateKey(item) === key);
}

export function buildMonthDays(
  year: number,
  month: number,
): { date: Date; inCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1);
  // 日历以周一为首列，把周日从0转换为6。
  const leading = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -leading);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return { date, inCurrentMonth: date.getMonth() === month };
  });
}
