import { z } from 'zod';

import { changeTypes, scheduleItemStatuses, scheduleItemTypes } from '@/types/schedule';

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();

export const scheduleItemInputSchema = z
  .object({
    type: z.enum(scheduleItemTypes),
    title: z.string().trim().min(1, '请输入事项标题').max(100, '标题不能超过100个字符'),
    course: optionalText,
    startAt: z.iso.datetime({ offset: true }).nullable().optional(),
    dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
    location: optionalText,
    submissionMethod: optionalText,
    requirements: z.array(z.string().trim().min(1)).default([]),
    status: z.enum(scheduleItemStatuses).default('confirmed'),
    reminderMinutes: z.number().int().nonnegative().nullable().optional(),
  })
  .refine((value) => value.startAt || value.dueAt, {
    message: '开始时间和截止时间至少填写一项',
    path: ['startAt'],
  });

export const persistedScheduleItemSchema = z.object({
  id: z.string(),
  sourceId: z.string().nullable(),
  relatedItemId: z.string().nullable(),
  type: z.enum(scheduleItemTypes),
  title: z.string(),
  course: z.string().nullable(),
  startAt: z.string().nullable(),
  dueAt: z.string().nullable(),
  location: z.string().nullable(),
  submissionMethod: z.string().nullable(),
  requirements: z.array(z.string()),
  sourceQuote: z.string().nullable(),
  originalTimeText: z.string().nullable(),
  confidence: z.number().nullable(),
  uncertainFields: z.array(z.string()),
  changeType: z.enum(changeTypes),
  status: z.enum(scheduleItemStatuses),
  createdAt: z.string(),
  updatedAt: z.string(),
});
