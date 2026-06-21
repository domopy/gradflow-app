import type { ScheduleChange, ScheduleItem } from '@/types/schedule';
import type { Source } from '@/types/source';

export interface GradFlowBackup {
  format: 'gradflow-backup';
  version: 1;
  exportedAt: string;
  sources: Source[];
  items: ScheduleItem[];
  changes: ScheduleChange[];
}
