import type { SQLiteDatabase } from 'expo-sqlite';

import { persistedScheduleItemSchema } from '@/schemas/schedule';
import type { ScheduleItem, ScheduleItemInput, ScheduleItemStatus } from '@/types/schedule';
import { createId } from '@/utils/id';

interface ScheduleItemRow {
  id: string;
  source_id: string | null;
  related_item_id: string | null;
  calendar_event_id: string | null;
  type: string;
  title: string;
  course: string | null;
  start_at: string | null;
  due_at: string | null;
  location: string | null;
  submission_method: string | null;
  requirements: string;
  source_quote: string | null;
  original_time_text: string | null;
  confidence: number | null;
  uncertain_fields: string;
  change_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function mapRow(row: ScheduleItemRow): ScheduleItem {
  return persistedScheduleItemSchema.parse({
    id: row.id,
    sourceId: row.source_id,
    relatedItemId: row.related_item_id,
    calendarEventId: row.calendar_event_id,
    type: row.type,
    title: row.title,
    course: row.course,
    startAt: row.start_at,
    dueAt: row.due_at,
    location: row.location,
    submissionMethod: row.submission_method,
    requirements: parseStringArray(row.requirements),
    sourceQuote: row.source_quote,
    originalTimeText: row.original_time_text,
    confidence: row.confidence,
    uncertainFields: parseStringArray(row.uncertain_fields),
    changeType: row.change_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function listScheduleItems(db: SQLiteDatabase): Promise<ScheduleItem[]> {
  const rows = await db.getAllAsync<ScheduleItemRow>(`
    SELECT *
    FROM schedule_items
    ORDER BY
      CASE WHEN status = 'completed' THEN 1 ELSE 0 END,
      COALESCE(start_at, due_at) ASC,
      created_at DESC
  `);
  return rows.map(mapRow);
}

export async function getScheduleItem(
  db: SQLiteDatabase,
  id: string,
): Promise<ScheduleItem | null> {
  const row = await db.getFirstAsync<ScheduleItemRow>(
    'SELECT * FROM schedule_items WHERE id = ?',
    id,
  );
  return row ? mapRow(row) : null;
}

export async function createScheduleItem(
  db: SQLiteDatabase,
  input: ScheduleItemInput,
): Promise<string> {
  const id = createId('item');
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO schedule_items (
      id, source_id, related_item_id, type, title, course, start_at, due_at, location,
      submission_method, requirements, source_quote, original_time_text,
      confidence, uncertain_fields, change_type, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.sourceId ?? null,
    input.relatedItemId ?? null,
    input.type,
    input.title,
    input.course ?? null,
    input.startAt ?? null,
    input.dueAt ?? null,
    input.location ?? null,
    input.submissionMethod ?? null,
    JSON.stringify(input.requirements ?? []),
    input.sourceQuote ?? null,
    input.originalTimeText ?? null,
    input.confidence ?? null,
    JSON.stringify(input.uncertainFields ?? []),
    input.changeType ?? 'created',
    input.status ?? 'confirmed',
    now,
    now,
  );

  return id;
}

export async function updateScheduleItem(
  db: SQLiteDatabase,
  id: string,
  input: ScheduleItemInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE schedule_items SET
      type = ?, title = ?, course = ?, start_at = ?, due_at = ?, location = ?,
      submission_method = ?, requirements = ?, status = ?, change_type = ?,
      related_item_id = ?, source_quote = ?, original_time_text = ?,
      confidence = ?, uncertain_fields = ?, updated_at = ?
    WHERE id = ?`,
    input.type,
    input.title,
    input.course ?? null,
    input.startAt ?? null,
    input.dueAt ?? null,
    input.location ?? null,
    input.submissionMethod ?? null,
    JSON.stringify(input.requirements ?? []),
    input.status ?? 'confirmed',
    input.changeType ?? 'created',
    input.relatedItemId ?? null,
    input.sourceQuote ?? null,
    input.originalTimeText ?? null,
    input.confidence ?? null,
    JSON.stringify(input.uncertainFields ?? []),
    new Date().toISOString(),
    id,
  );
}

export async function updateScheduleItemStatus(
  db: SQLiteDatabase,
  id: string,
  status: ScheduleItemStatus,
): Promise<void> {
  await db.runAsync(
    'UPDATE schedule_items SET status = ?, updated_at = ? WHERE id = ?',
    status,
    new Date().toISOString(),
    id,
  );
}

export async function deleteScheduleItem(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM schedule_items WHERE id = ?', id);
}

export async function setScheduleItemCalendarEventId(
  db: SQLiteDatabase,
  id: string,
  calendarEventId: string | null,
): Promise<void> {
  await db.runAsync(
    'UPDATE schedule_items SET calendar_event_id = ?, updated_at = ? WHERE id = ?',
    calendarEventId,
    new Date().toISOString(),
    id,
  );
}
