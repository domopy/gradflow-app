import { z } from 'zod';

import { changeTypes, scheduleItemTypes } from '@/types/schedule';

const nullableDateTime = z
  .union([z.iso.datetime({ offset: true }), z.null()])
  .catch(null);

export const extractedScheduleItemSchema = z.object({
  type: z.enum(scheduleItemTypes).catch('other'),
  title: z.string().trim().min(1).max(100),
  course: z.string().trim().nullable().catch(null),
  startAt: nullableDateTime,
  dueAt: nullableDateTime,
  location: z.string().trim().nullable().catch(null),
  submissionMethod: z.string().trim().nullable().catch(null),
  requirements: z.array(z.string().trim().min(1)).catch([]),
  relatedPeople: z.array(z.string().trim().min(1)).catch([]),
  sourceQuote: z.string().trim().min(1),
  originalTimeText: z.string().trim().nullable().catch(null),
  confidence: z.number().min(0).max(1).catch(0),
  uncertainFields: z.array(z.string().trim().min(1)).catch([]),
  changeType: z.enum(changeTypes).catch('created'),
  relatedItemId: z.string().trim().nullable().catch(null),
});

export const extractionResultSchema = z.object({
  items: z.array(extractedScheduleItemSchema).max(20),
});

export const deepSeekResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.string().nullable(),
        }),
      }),
    )
    .min(1),
});
