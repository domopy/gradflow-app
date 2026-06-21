import { describe, expect, it } from 'vitest';

import { scheduleItemInputSchema } from '../src/schemas/schedule';

describe('事项输入校验', () => {
  it('接受至少包含一个有效时间的事项', () => {
    const result = scheduleItemInputSchema.safeParse({
      type: 'assignment',
      title: '机器学习作业',
      startAt: null,
      dueAt: '2026-06-26T15:59:00.000Z',
      requirements: ['提交实验报告'],
      status: 'confirmed',
      reminderMinutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it('拒绝没有标题或时间的事项', () => {
    expect(
      scheduleItemInputSchema.safeParse({
        type: 'meeting',
        title: ' ',
        startAt: null,
        dueAt: null,
      }).success,
    ).toBe(false);
  });
});
