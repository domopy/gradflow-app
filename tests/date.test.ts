import { describe, expect, it } from 'vitest';

import {
  buildMonthDays,
  commitDateTimeSelection,
  dateTimeInputToDate,
  mergeDateTimeSelection,
  parseDateTimeInput,
  toDateKey,
} from '../src/utils/date';

describe('日期工具', () => {
  it('解析有效的本地日期时间', () => {
    const parsed = parseDateTimeInput('2026-06-21 15:00');
    expect(parsed).not.toBeNull();
    expect(new Date(parsed!).getFullYear()).toBe(2026);
    expect(new Date(parsed!).getMonth()).toBe(5);
    expect(new Date(parsed!).getDate()).toBe(21);
    expect(new Date(parsed!).getHours()).toBe(15);
  });

  it('拒绝自动进位的无效日期', () => {
    expect(parseDateTimeInput('2026-02-31 15:00')).toBeNull();
    expect(parseDateTimeInput('明天下午三点')).toBeNull();
  });

  it('日期选择只替换日期并保留手动输入的时间', () => {
    const current = dateTimeInputToDate('2026-06-21 15:40');
    const selected = new Date(2026, 6, 8, 9, 10);
    const merged = mergeDateTimeSelection(current, selected, 'date');

    expect(merged.getFullYear()).toBe(2026);
    expect(merged.getMonth()).toBe(6);
    expect(merged.getDate()).toBe(8);
    expect(merged.getHours()).toBe(15);
    expect(merged.getMinutes()).toBe(40);
  });

  it('时间选择只替换时间并保留手动输入的日期', () => {
    const current = dateTimeInputToDate('2026-06-21 15:40');
    const selected = new Date(2030, 0, 1, 8, 5);
    const merged = mergeDateTimeSelection(current, selected, 'time');

    expect(merged.getFullYear()).toBe(2026);
    expect(merged.getMonth()).toBe(5);
    expect(merged.getDate()).toBe(21);
    expect(merged.getHours()).toBe(8);
    expect(merged.getMinutes()).toBe(5);
  });

  it('空时间使用回退值且保持本地时区字段', () => {
    const fallback = new Date(2026, 5, 21, 23, 55);
    const result = dateTimeInputToDate('', fallback);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(21);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(55);
  });

  it('取消选择时保留尚未完成的手动输入', () => {
    const current = '2026-06-2';
    const draft = new Date(2026, 5, 21, 8, 0);

    expect(commitDateTimeSelection(current, draft, false)).toBe(current);
  });

  it('午夜边界按本地日期保存，不额外偏移一天', () => {
    const draft = new Date(2026, 5, 22, 0, 5);

    expect(commitDateTimeSelection('', draft, true)).toBe('2026-06-22 00:05');
  });

  it('生成从周一开始的六周月历网格', () => {
    const days = buildMonthDays(2026, 5);
    expect(days).toHaveLength(42);
    expect(days[0].date.getDay()).toBe(1);
    expect(days.some(({ date }) => toDateKey(date) === '2026-06-30')).toBe(true);
  });
});
