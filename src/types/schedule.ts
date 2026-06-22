export const scheduleItemTypes = [
  'exam',
  'assignment',
  'meeting',
  'experiment',
  'course',
  'defense',
  'lecture',
  'other',
] as const;

export type ScheduleItemType = (typeof scheduleItemTypes)[number];

export const scheduleItemStatuses = [
  'pending_confirmation',
  'confirmed',
  'completed',
  'cancelled',
] as const;

export type ScheduleItemStatus = (typeof scheduleItemStatuses)[number];

export const changeTypes = [
  'created',
  'rescheduled',
  'relocated',
  'extended',
  'cancelled',
] as const;

export type ChangeType = (typeof changeTypes)[number];

export interface ScheduleItem {
  id: string;
  sourceId: string | null;
  relatedItemId: string | null;
  calendarEventId?: string | null;
  type: ScheduleItemType;
  title: string;
  course: string | null;
  startAt: string | null;
  dueAt: string | null;
  location: string | null;
  submissionMethod: string | null;
  requirements: string[];
  sourceQuote: string | null;
  originalTimeText: string | null;
  confidence: number | null;
  uncertainFields: string[];
  changeType: ChangeType;
  status: ScheduleItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItemInput {
  sourceId?: string | null;
  relatedItemId?: string | null;
  type: ScheduleItemType;
  title: string;
  course?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  location?: string | null;
  submissionMethod?: string | null;
  requirements?: string[];
  sourceQuote?: string | null;
  originalTimeText?: string | null;
  confidence?: number | null;
  uncertainFields?: string[];
  changeType?: ChangeType;
  status?: ScheduleItemStatus;
  reminderMinutes?: number | null;
}

export interface ScheduleChange {
  id: string;
  itemId: string;
  sourceId: string | null;
  changeType: Exclude<ChangeType, 'created'>;
  beforeSnapshot: ScheduleItem;
  afterSnapshot: ScheduleItem;
  createdAt: string;
}

export interface Reminder {
  id: string;
  itemId: string;
  remindAt: string;
  notificationId: string;
  createdAt: string;
}
