import type { ChangeType, ScheduleItemType } from '@/types/schedule';

export interface ExtractedScheduleItem {
  type: ScheduleItemType;
  title: string;
  course: string | null;
  startAt: string | null;
  dueAt: string | null;
  location: string | null;
  submissionMethod: string | null;
  requirements: string[];
  relatedPeople: string[];
  sourceQuote: string;
  originalTimeText: string | null;
  confidence: number;
  uncertainFields: string[];
  changeType: ChangeType;
  relatedItemId: string | null;
}

export interface ExtractionResult {
  items: ExtractedScheduleItem[];
}

export interface ExtractionRequest {
  text: string;
  messageDate: string;
  timeZone: string;
  existingItems?: {
    id: string;
    title: string;
    course: string | null;
    startAt: string | null;
    dueAt: string | null;
    location: string | null;
  }[];
}

export interface AiConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}
