import { createContext, useContext } from 'react';

import type {
  Reminder,
  ScheduleChange,
  ScheduleItem,
  ScheduleItemInput,
  ScheduleItemStatus,
} from '@/types/schedule';
import type { Source, SourceInput } from '@/types/source';

export interface ScheduleContextValue {
  items: ScheduleItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  createSource: (input: SourceInput) => Promise<string>;
  saveImportedItems: (
    source: SourceInput,
    items: ScheduleItemInput[],
  ) => Promise<{
    itemIds: string[];
    reminderFailureCount: number;
    reminderFailureMessages: string[];
  }>;
  getItem: (id: string) => Promise<ScheduleItem | null>;
  getReminder: (itemId: string) => Promise<Reminder | null>;
  getSource: (id: string) => Promise<Source | null>;
  getChanges: (itemId: string) => Promise<ScheduleChange[]>;
  saveItem: (
    input: ScheduleItemInput,
    id?: string,
  ) => Promise<{
    id: string;
    reminderScheduled: boolean | null;
    reminderFailureMessage: string | null;
  }>;
  removeItem: (id: string) => Promise<void>;
  setStatus: (id: string, status: ScheduleItemStatus) => Promise<void>;
  syncCalendar: (id: string) => Promise<'created' | 'updated'>;
  exportBackup: () => Promise<string>;
  restoreBackup: (json: string) => Promise<number>;
}

export const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule必须在ScheduleProvider内使用');
  }
  return context;
}
