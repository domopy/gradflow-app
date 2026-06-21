import { describe, expect, it } from 'vitest';

import { parseBackup } from '../src/services/backup/backup-service';
import type { ScheduleItem } from '../src/types/schedule';
import { findScheduleConflicts } from '../src/utils/conflicts';
import { applyChangeToItem } from '../src/utils/schedule-changes';
import {
  getReminderTarget,
  resolveChangedReminderMinutes,
} from '../src/utils/reminders';

function item(
  id: string,
  startAt: string | null,
  dueAt: string | null = null,
): ScheduleItem {
  return {
    id,
    sourceId: null,
    relatedItemId: null,
    type: 'meeting',
    title: id,
    course: '课题组',
    startAt,
    dueAt,
    location: '实验楼507',
    submissionMethod: null,
    requirements: ['准备PPT'],
    sourceQuote: null,
    originalTimeText: null,
    confidence: null,
    uncertainFields: [],
    changeType: 'created',
    status: 'confirmed',
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  };
}

describe('v0.4变更与冲突', () => {
  it('提醒优先使用开始时间，没有开始时间时才使用截止时间', () => {
    const meeting = item(
      'meeting',
      '2026-06-22T07:00:00.000Z',
      '2026-06-22T09:00:00.000Z',
    );
    const assignment = item('assignment', null, '2026-06-22T09:00:00.000Z');
    expect(getReminderTarget(meeting)?.toISOString()).toBe(meeting.startAt);
    expect(getReminderTarget(assignment)?.toISOString()).toBe(assignment.dueAt);
  });

  it('变更事项可保持、修改或关闭提醒，取消事项始终关闭提醒', () => {
    expect(resolveChangedReminderMinutes('rescheduled', undefined, 60)).toBe(60);
    expect(resolveChangedReminderMinutes('extended', 5, 60)).toBe(5);
    expect(resolveChangedReminderMinutes('relocated', null, 60)).toBeNull();
    expect(resolveChangedReminderMinutes('cancelled', 5, 60)).toBeNull();
  });

  it('改期只覆盖明确变化的时间并保留准备事项', () => {
    const current = item('meeting-1', '2026-06-22T07:00:00.000Z');
    const changed = applyChangeToItem(current, {
      type: 'meeting',
      title: '组会改期',
      startAt: '2026-06-24T08:00:00.000Z',
      requirements: [],
      changeType: 'rescheduled',
      relatedItemId: current.id,
    });
    expect(changed.startAt).toBe('2026-06-24T08:00:00.000Z');
    expect(changed.location).toBe('实验楼507');
    expect(changed.requirements).toEqual(['准备PPT']);
  });

  it('取消事项时保留原信息并更新状态', () => {
    const current = item('meeting-1', '2026-06-22T07:00:00.000Z');
    const changed = applyChangeToItem(current, {
      type: 'meeting',
      title: '组会取消',
      changeType: 'cancelled',
      relatedItemId: current.id,
    });
    expect(changed.status).toBe('cancelled');
    expect(changed.startAt).toBe(current.startAt);
  });

  it('检测重叠会议但忽略只有截止时间的作业', () => {
    const first = item(
      'first',
      '2026-06-22T07:00:00.000Z',
      '2026-06-22T09:00:00.000Z',
    );
    const second = item('second', '2026-06-22T08:30:00.000Z');
    const assignment = {
      ...item('assignment', null, '2026-06-22T08:45:00.000Z'),
      type: 'assignment' as const,
    };
    expect(findScheduleConflicts([first, second, assignment])).toEqual([
      { firstId: 'first', secondId: 'second', overlapMinutes: 30 },
    ]);
  });
});

describe('v0.4备份格式', () => {
  it('接受不包含密钥和图片内容的版本1备份', () => {
    const backup = parseBackup(
      JSON.stringify({
        format: 'gradflow-backup',
        version: 1,
        exportedAt: '2026-06-21T00:00:00.000Z',
        sources: [],
        items: [item('meeting-1', '2026-06-22T07:00:00.000Z')],
        changes: [],
      }),
    );
    expect(backup.items).toHaveLength(1);
    expect(JSON.stringify(backup)).not.toContain('apiKey');
  });

  it('拒绝未知版本，避免错误覆盖本地数据', () => {
    expect(() =>
      parseBackup(
        JSON.stringify({
          format: 'gradflow-backup',
          version: 2,
          exportedAt: '2026-06-21T00:00:00.000Z',
          sources: [],
          items: [],
          changes: [],
        }),
      ),
    ).toThrow('备份格式不正确');
  });
});
