import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getNotificationPermissions: vi.fn(),
  requestNotificationPermissions: vi.fn(),
  scheduleNotification: vi.fn(),
  setChannel: vi.fn(),
  getCalendarEvent: vi.fn(),
  requestCalendarPermission: vi.fn(),
  getCalendars: vi.fn(),
  createEvent: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

vi.mock('@/utils/runtime', () => ({
  isExpoGo: () => false,
}));

vi.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: mocks.getNotificationPermissions,
  requestPermissionsAsync: mocks.requestNotificationPermissions,
  scheduleNotificationAsync: mocks.scheduleNotification,
  setNotificationChannelAsync: mocks.setChannel,
  setNotificationHandler: vi.fn(),
}));

vi.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  requestCalendarPermissions: mocks.requestCalendarPermission,
  getCalendars: mocks.getCalendars,
  ExpoCalendarEvent: { get: mocks.getCalendarEvent },
}));

import { syncItemToSystemCalendar } from '@/services/calendar/calendar-service';
import { scheduleItemNotification } from '@/services/notifications/notification-service';
import type { ScheduleItem } from '@/types/schedule';

function item(patch: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: 'item-1',
    sourceId: null,
    relatedItemId: null,
    calendarEventId: null,
    type: 'meeting',
    title: '组会',
    course: null,
    startAt: new Date(Date.now() + 3_600_000).toISOString(),
    dueAt: null,
    location: '实验楼507',
    submissionMethod: null,
    requirements: [],
    sourceQuote: null,
    originalTimeText: null,
    confidence: null,
    uncertainFields: [],
    changeType: 'created',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...patch,
  };
}

describe('系统集成服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestCalendarPermission.mockResolvedValue({ granted: true });
  });

  it('明确返回通知权限被拒绝的原因', async () => {
    mocks.getNotificationPermissions.mockResolvedValue({ granted: false });
    mocks.requestNotificationPermissions.mockResolvedValue({ granted: false });

    const result = await scheduleItemNotification(item(), 5);

    expect(result).toMatchObject({
      ok: false,
      reason: 'permission_denied',
    });
  });

  it('拒绝创建已经过去的提醒', async () => {
    mocks.getNotificationPermissions.mockResolvedValue({ granted: true });

    const result = await scheduleItemNotification(
      item({ startAt: new Date(Date.now() + 60_000).toISOString() }),
      5,
    );

    expect(result).toMatchObject({ ok: false, reason: 'past_time' });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });

  it('已有日历事件时执行更新而不是重复创建', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mocks.getCalendarEvent.mockResolvedValue({ update });

    const result = await syncItemToSystemCalendar(
      item({ calendarEventId: 'calendar-event-1' }),
    );

    expect(result).toEqual({ eventId: 'calendar-event-1', action: 'updated' });
    expect(update).toHaveBeenCalledOnce();
    expect(mocks.createEvent).not.toHaveBeenCalled();
  });

  it('系统事件被删除后重新创建', async () => {
    mocks.getCalendarEvent.mockRejectedValue(new Error('not found'));
    mocks.createEvent.mockResolvedValue({ id: 'calendar-event-2' });
    mocks.getCalendars.mockResolvedValue([
      {
        id: 'calendar-1',
        allowsModifications: true,
        isPrimary: true,
        createEvent: mocks.createEvent,
      },
    ]);

    const result = await syncItemToSystemCalendar(
      item({ calendarEventId: 'missing-event' }),
    );

    expect(result).toEqual({ eventId: 'calendar-event-2', action: 'created' });
    expect(mocks.createEvent).toHaveBeenCalledOnce();
  });
});
