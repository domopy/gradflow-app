import { describe, expect, it } from 'vitest';

import type { ScheduleItem } from '../src/types/schedule';
import { groupUpcomingItems } from '../src/utils/schedule-groups';

function item(id: string, startAt: string, status: ScheduleItem['status'] = 'confirmed') {
  return {
    id,
    sourceId: null,
    relatedItemId: null,
    type: 'meeting',
    title: id,
    course: null,
    startAt,
    dueAt: null,
    location: null,
    submissionMethod: null,
    requirements: [],
    sourceQuote: null,
    originalTimeText: null,
    confidence: null,
    uncertainFields: [],
    changeType: 'created',
    status,
    createdAt: startAt,
    updatedAt: startAt,
  } satisfies ScheduleItem;
}

describe('今日页分组', () => {
  const now = new Date(2026, 5, 20, 10, 0);

  it('按今天、三天内和本周随后分组', () => {
    const groups = groupUpcomingItems(
      [
        item('today', new Date(2026, 5, 20, 15).toISOString()),
        item('tomorrow', new Date(2026, 5, 21, 9).toISOString()),
        item('four-days', new Date(2026, 5, 24, 9).toISOString()),
        item('later', new Date(2026, 6, 10, 9).toISOString()),
      ],
      now,
    );

    expect(groups.today.map(({ id }) => id)).toEqual(['today']);
    expect(groups.nextThreeDays.map(({ id }) => id)).toEqual(['tomorrow']);
    expect(groups.thisWeek.map(({ id }) => id)).toEqual(['four-days']);
    expect(groups.later.map(({ id }) => id)).toEqual(['later']);
  });

  it('忽略已取消事项', () => {
    const groups = groupUpcomingItems(
      [item('cancelled', new Date(2026, 5, 20, 15).toISOString(), 'cancelled')],
      now,
    );
    expect(groups.today).toHaveLength(0);
  });
});
