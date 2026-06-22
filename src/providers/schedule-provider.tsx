import { useSQLiteContext } from 'expo-sqlite';
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItem,
  listScheduleItems,
  setScheduleItemCalendarEventId,
  updateScheduleItem,
  updateScheduleItemStatus,
} from '@/db/repositories/schedule-items';
import {
  deleteReminderRecord,
  getReminderForItem,
  replaceReminder,
} from '@/db/repositories/reminders';
import {
  createSource as insertSource,
  deleteSourceIfOrphaned,
  getSource as selectSource,
} from '@/db/repositories/sources';
import {
  createScheduleChange,
  listChangeSourceIds,
  listScheduleChanges,
} from '@/db/repositories/schedule-changes';
import {
  cancelNotification,
  scheduleItemNotification,
} from '@/services/notifications/notification-service';
import { deleteImageFiles } from '@/services/images/image-service';
import type { ScheduleItem, ScheduleItemInput, ScheduleItemStatus } from '@/types/schedule';
import type { SourceInput } from '@/types/source';
import { ScheduleContext, useSchedule } from '@/providers/schedule-context';
import { applyChangeToItem } from '@/utils/schedule-changes';
import { resolveChangedReminderMinutes } from '@/utils/reminders';
import {
  exportBackup as createBackupJson,
  parseBackup,
  replaceFromBackup,
} from '@/services/backup/backup-service';
import {
  deleteSystemCalendarEvent,
  syncItemToSystemCalendar,
} from '@/services/calendar/calendar-service';

export function ScheduleProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextItems = await listScheduleItems(db);
    setItems(nextItems);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    let active = true;
    listScheduleItems(db)
      .then((nextItems) => {
        if (active) {
          setItems(nextItems);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [db]);

  const getItem = useCallback((id: string) => getScheduleItem(db, id), [db]);
  const getReminder = useCallback(
    (itemId: string) => getReminderForItem(db, itemId),
    [db],
  );
  const getSource = useCallback((id: string) => selectSource(db, id), [db]);
  const getChanges = useCallback((id: string) => listScheduleChanges(db, id), [db]);
  const createSource = useCallback(
    (input: SourceInput) => insertSource(db, input),
    [db],
  );
  const saveImportedItems = useCallback(
    async (source: SourceInput, inputs: ScheduleItemInput[]) => {
      const itemIds: string[] = [];
      const changedItemIds: string[] = [];
      const newItemReminders: { itemId: string; minutesBefore: number }[] = [];
      const reminderLeads = new Map<string, number | null | undefined>();
      for (const input of inputs) {
        if (input.changeType && input.changeType !== 'created' && input.relatedItemId) {
          const [previous, reminder] = await Promise.all([
            getScheduleItem(db, input.relatedItemId),
            getReminderForItem(db, input.relatedItemId),
          ]);
          const previousTarget = previous?.startAt ?? previous?.dueAt;
          const previousLead =
            reminder && previousTarget
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(previousTarget).getTime() -
                      new Date(reminder.remindAt).getTime()) /
                      60_000,
                  ),
                )
              : undefined;
          reminderLeads.set(
            input.relatedItemId,
            resolveChangedReminderMinutes(
              input.changeType,
              input.reminderMinutes,
              previousLead,
            ),
          );
        }
      }
      await db.withTransactionAsync(async () => {
        const sourceId = await insertSource(db, source);
        for (const input of inputs) {
          if (input.changeType && input.changeType !== 'created' && input.relatedItemId) {
            const previous = await getScheduleItem(db, input.relatedItemId);
            if (!previous) {
              throw new Error(`找不到要变更的事项：${input.title}`);
            }
            const merged = applyChangeToItem(previous, input);
            await updateScheduleItem(db, previous.id, merged);
            const after = await getScheduleItem(db, previous.id);
            if (!after) {
              throw new Error('变更事项保存失败');
            }
            await createScheduleChange(
              db,
              previous.id,
              sourceId,
              input.changeType,
              previous,
              after,
            );
            itemIds.push(previous.id);
            changedItemIds.push(previous.id);
          } else {
            const itemId = await createScheduleItem(db, { ...input, sourceId });
            itemIds.push(itemId);
            if (input.reminderMinutes != null) {
              newItemReminders.push({
                itemId,
                minutesBefore: input.reminderMinutes,
              });
            }
          }
        }
      });
      let reminderFailureCount = 0;
      const reminderFailureMessages: string[] = [];
      for (const itemId of new Set(changedItemIds)) {
        const reminderUpdated = await rescheduleChangedItem(
          db,
          itemId,
          reminderLeads.get(itemId),
        );
        if (!reminderUpdated) {
          reminderFailureCount += 1;
        }
      }
      for (const { itemId, minutesBefore } of newItemReminders) {
        try {
          const item = await getScheduleItem(db, itemId);
          const scheduled = item
            ? await scheduleItemNotification(item, minutesBefore)
            : null;
          if (!scheduled || !scheduled.ok) {
            reminderFailureCount += 1;
            reminderFailureMessages.push(
              scheduled?.message ?? '事项不存在，无法创建提醒。',
            );
            continue;
          }
          await replaceReminder(
            db,
            itemId,
            scheduled.remindAt,
            scheduled.notificationId,
          );
        } catch {
          // 日程已经保存，提醒失败只反馈给用户，不回滚已确认内容。
          reminderFailureCount += 1;
        }
      }
      await refresh();
      return { itemIds, reminderFailureCount, reminderFailureMessages };
    },
    [db, refresh],
  );

  const saveItem = useCallback(
    async (input: ScheduleItemInput, id?: string) => {
      const previousItem = id ? await getScheduleItem(db, id) : null;
      const previousReminder = id ? await getReminderForItem(db, id) : null;
      let effectiveReminderMinutes = input.reminderMinutes;

      // 修改时间时沿用原来的提前量并重新调度，避免提醒仍指向旧时间。
      if (
        effectiveReminderMinutes === undefined &&
        previousItem &&
        previousReminder
      ) {
        const previousTarget = previousItem.startAt ?? previousItem.dueAt;
        if (previousTarget) {
          effectiveReminderMinutes = Math.max(
            0,
            Math.round(
              (new Date(previousTarget).getTime() -
                new Date(previousReminder.remindAt).getTime()) /
                60_000,
            ),
          );
        }
      }

      const itemId = id ?? (await createScheduleItem(db, input));
      let reminderScheduled: boolean | null = null;
      let reminderFailureMessage: string | null = null;
      if (id) {
        await updateScheduleItem(db, id, {
          ...input,
          sourceId: input.sourceId ?? previousItem?.sourceId ?? null,
          relatedItemId: input.relatedItemId ?? previousItem?.relatedItemId ?? null,
          sourceQuote: input.sourceQuote ?? previousItem?.sourceQuote ?? null,
          originalTimeText:
            input.originalTimeText ?? previousItem?.originalTimeText ?? null,
          confidence: input.confidence ?? previousItem?.confidence ?? null,
          uncertainFields:
            input.uncertainFields ?? previousItem?.uncertainFields ?? [],
          changeType: input.changeType ?? previousItem?.changeType ?? 'created',
        });
        if (previousItem?.calendarEventId) {
          const updatedItem = await getScheduleItem(db, id);
          if (updatedItem) {
            try {
              const synced = await syncItemToSystemCalendar(updatedItem);
              await setScheduleItemCalendarEventId(db, id, synced.eventId);
            } catch {
              // 日历同步失败不回滚已保存事项，用户可在详情页再次手动同步。
            }
          }
        }
      }

      // 编辑表单未触碰提醒字段时保持现状；显式传入null才删除提醒。
      if (effectiveReminderMinutes !== undefined) {
        const existingReminder = previousReminder ?? (await getReminderForItem(db, itemId));
        if (existingReminder) {
          await cancelNotification(existingReminder.notificationId);
          await deleteReminderRecord(db, itemId);
        }

        if (effectiveReminderMinutes !== null) {
          const savedItem = await getScheduleItem(db, itemId);
          if (savedItem) {
            const scheduled = await scheduleItemNotification(
              savedItem,
              effectiveReminderMinutes,
            );
            if (scheduled.ok) {
              await replaceReminder(
                db,
                itemId,
                scheduled.remindAt,
                scheduled.notificationId,
              );
              reminderScheduled = true;
            } else {
              reminderScheduled = false;
              reminderFailureMessage = scheduled.message;
            }
          }
        }
      }

      await refresh();
      return { id: itemId, reminderScheduled, reminderFailureMessage };
    },
    [db, refresh],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const item = await getScheduleItem(db, id);
      const changeSourceIds = await listChangeSourceIds(db, id);
      const reminder = await getReminderForItem(db, id);
      if (item?.calendarEventId) {
        await deleteSystemCalendarEvent(item.calendarEventId);
      }
      if (reminder) {
        await cancelNotification(reminder.notificationId);
      }
      await deleteScheduleItem(db, id);
      if (item?.sourceId) {
        const imageUris = await deleteSourceIfOrphaned(db, item.sourceId);
        await deleteImageFiles(imageUris);
      }
      for (const sourceId of changeSourceIds) {
        const imageUris = await deleteSourceIfOrphaned(db, sourceId);
        await deleteImageFiles(imageUris);
      }
      await refresh();
    },
    [db, refresh],
  );

  const setStatus = useCallback(
    async (id: string, status: ScheduleItemStatus) => {
      if (status === 'cancelled') {
        const reminder = await getReminderForItem(db, id);
        if (reminder) {
          await cancelNotification(reminder.notificationId);
          await deleteReminderRecord(db, id);
        }
      }
      await updateScheduleItemStatus(db, id, status);
      await refresh();
    },
    [db, refresh],
  );
  const syncCalendar = useCallback(
    async (id: string) => {
      const item = await getScheduleItem(db, id);
      if (!item) {
        throw new Error('事项不存在');
      }
      const result = await syncItemToSystemCalendar(item);
      await setScheduleItemCalendarEventId(db, id, result.eventId);
      await refresh();
      return result.action;
    },
    [db, refresh],
  );
  const exportBackup = useCallback(() => createBackupJson(db), [db]);
  const restoreBackup = useCallback(
    async (json: string) => {
      const backup = parseBackup(json);
      const cleanup = await replaceFromBackup(db, backup);
      for (const notificationId of cleanup.notificationIds) {
        try {
          await cancelNotification(notificationId);
        } catch {
          // 系统通知可能已被用户手动清理，不影响已完成的本地恢复。
        }
      }
      await deleteImageFiles(cleanup.imageUris);
      await refresh();
      return backup.items.length;
    },
    [db, refresh],
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      refresh,
      createSource,
      saveImportedItems,
      getItem,
      getReminder,
      getSource,
      getChanges,
      saveItem,
      removeItem,
      setStatus,
      syncCalendar,
      exportBackup,
      restoreBackup,
    }),
    [
      createSource,
      getItem,
      getReminder,
      getSource,
      getChanges,
      items,
      loading,
      refresh,
      removeItem,
      saveImportedItems,
      saveItem,
      setStatus,
      syncCalendar,
      exportBackup,
      restoreBackup,
    ],
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

async function rescheduleChangedItem(
  db: ReturnType<typeof useSQLiteContext>,
  itemId: string,
  nextLeadMinutes: number | null | undefined,
): Promise<boolean> {
  try {
    const reminder = await getReminderForItem(db, itemId);
    const item = await getScheduleItem(db, itemId);
    if (reminder) {
      await cancelNotification(reminder.notificationId);
      await deleteReminderRecord(db, itemId);
    }
    if (!item || item.status === 'cancelled' || nextLeadMinutes == null) {
      return true;
    }
    const scheduled = await scheduleItemNotification(item, nextLeadMinutes);
    if (!scheduled.ok) return false;
    await replaceReminder(db, itemId, scheduled.remindAt, scheduled.notificationId);
    return true;
  } catch {
    // 系统提醒失败不回滚已经由用户确认的日程变更。
    return nextLeadMinutes == null;
  }
}

export { useSchedule };
