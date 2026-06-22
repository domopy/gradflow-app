import type { PropsWithChildren } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { ScheduleContext, useSchedule } from '@/providers/schedule-context';
import type {
  Reminder,
  ScheduleItem,
  ScheduleItemInput,
  ScheduleItemStatus,
} from '@/types/schedule';
import type { SourceInput } from '@/types/source';
import { createId } from '@/utils/id';
import { parseBackup } from '@/services/backup/backup-service';

function at(days: number, hour: number, minute = 0): string {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
    hour,
    minute,
  ).toISOString();
}

function createPreviewItems(): ScheduleItem[] {
  const createdAt = new Date().toISOString();
  const base = {
    sourceId: null,
    relatedItemId: null,
    calendarEventId: null,
    submissionMethod: null,
    sourceQuote: null,
    originalTimeText: null,
    confidence: null,
    uncertainFields: [],
    changeType: 'created' as const,
    createdAt,
    updatedAt: createdAt,
  };

  return [
    {
      ...base,
      id: 'preview-meeting',
      type: 'meeting',
      title: '课题组组会',
      course: '自然语言处理课题组',
      startAt: at(0, 15),
      dueAt: null,
      location: '实验楼507',
      requirements: ['准备5页以内PPT', '汇报本周实验结果'],
      status: 'confirmed',
    },
    {
      ...base,
      id: 'preview-assignment',
      type: 'assignment',
      title: '机器学习作业三',
      course: '机器学习',
      startAt: null,
      dueAt: at(1, 23, 59),
      location: null,
      requirements: ['提交实验报告和源代码'],
      status: 'confirmed',
    },
    {
      ...base,
      id: 'preview-experiment',
      type: 'experiment',
      title: '讨论消融实验结果',
      course: '毕业论文',
      startAt: at(3, 10),
      dueAt: null,
      location: '实验楼404',
      requirements: ['整理对比表格'],
      status: 'pending_confirmation',
    },
    {
      ...base,
      id: 'preview-exam',
      type: 'exam',
      title: '机器学习期末考试',
      course: '机器学习',
      startAt: at(5, 14),
      dueAt: at(5, 16),
      location: 'A302',
      requirements: ['携带学生证'],
      status: 'confirmed',
    },
  ];
}

export function ScheduleProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ScheduleItem[]>(createPreviewItems);

  const refresh = useCallback(async () => {}, []);
  const createSource = useCallback(async (_input: SourceInput) => createId('source'), []);
  const getItem = useCallback(
    async (id: string) => items.find((item) => item.id === id) ?? null,
    [items],
  );
  const getReminder = useCallback(
    async (_itemId: string): Promise<Reminder | null> => null,
    [],
  );
  const getSource = useCallback(async () => null, []);
  const getChanges = useCallback(async () => [], []);
  const saveItem = useCallback(
    async (input: ScheduleItemInput, id?: string) => {
      const now = new Date().toISOString();
      const itemId = id ?? createId('preview');
      setItems((current) => {
        const previous = current.find((item) => item.id === itemId);
        const next: ScheduleItem = {
          id: itemId,
          sourceId: input.sourceId ?? previous?.sourceId ?? null,
          relatedItemId: input.relatedItemId ?? previous?.relatedItemId ?? null,
          calendarEventId: previous?.calendarEventId ?? null,
          type: input.type,
          title: input.title,
          course: input.course ?? null,
          startAt: input.startAt ?? null,
          dueAt: input.dueAt ?? null,
          location: input.location ?? null,
          submissionMethod: input.submissionMethod ?? null,
          requirements: input.requirements ?? [],
          sourceQuote: input.sourceQuote ?? previous?.sourceQuote ?? null,
          originalTimeText: input.originalTimeText ?? previous?.originalTimeText ?? null,
          confidence: input.confidence ?? previous?.confidence ?? null,
          uncertainFields: input.uncertainFields ?? previous?.uncertainFields ?? [],
          changeType: input.changeType ?? previous?.changeType ?? 'created',
          status: input.status ?? 'confirmed',
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        return previous
          ? current.map((item) => (item.id === itemId ? next : item))
          : [...current, next];
      });
      return {
        id: itemId,
        reminderScheduled: input.reminderMinutes != null ? false : null,
        reminderFailureMessage:
          input.reminderMinutes != null ? '网页端不支持本地提醒。' : null,
      };
    },
    [],
  );
  const saveImportedItems = useCallback(
    async (_source: SourceInput, inputs: ScheduleItemInput[]) => {
      const ids: string[] = [];
      let reminderFailureCount = 0;
      for (const input of inputs) {
        const saved = await saveItem(input);
        ids.push(saved.id);
        if (input.reminderMinutes != null) {
          reminderFailureCount += 1;
        }
      }
      return {
        itemIds: ids,
        reminderFailureCount,
        reminderFailureMessages:
          reminderFailureCount > 0 ? ['网页端不支持本地提醒。'] : [],
      };
    },
    [saveItem],
  );
  const removeItem = useCallback(async (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const setStatus = useCallback(async (id: string, status: ScheduleItemStatus) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item,
      ),
    );
  }, []);
  const syncCalendar = useCallback(async (): Promise<'created' | 'updated'> => {
    throw new Error('网页端不支持写入系统日历');
  }, []);
  const exportBackup = useCallback(
    async () =>
      JSON.stringify(
        {
          format: 'gradflow-backup',
          version: 1,
          exportedAt: new Date().toISOString(),
          sources: [],
          items,
          changes: [],
        },
        null,
        2,
      ),
    [items],
  );
  const restoreBackup = useCallback(async (json: string) => {
    const backup = parseBackup(json);
    setItems(backup.items);
    return backup.items.length;
  }, []);

  const value = useMemo(
    () => ({
      items,
      loading: false,
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

export { useSchedule };
