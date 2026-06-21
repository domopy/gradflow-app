import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import { persistedScheduleItemSchema } from '@/schemas/schedule';
import type { GradFlowBackup } from '@/types/backup';

const sourceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'image', 'manual']),
  originalText: z.string().nullable(),
  imageUri: z.string().nullable(),
  imageUris: z.array(z.string()),
  messageDate: z.string().nullable(),
  createdAt: z.string(),
});

const backupSchema = z.object({
  format: z.literal('gradflow-backup'),
  version: z.literal(1),
  exportedAt: z.string(),
  sources: z.array(sourceSchema),
  items: z.array(persistedScheduleItemSchema),
  changes: z.array(
    z.object({
      id: z.string(),
      itemId: z.string(),
      sourceId: z.string().nullable(),
      changeType: z.enum(['rescheduled', 'relocated', 'extended', 'cancelled']),
      beforeSnapshot: persistedScheduleItemSchema,
      afterSnapshot: persistedScheduleItemSchema,
      createdAt: z.string(),
    }),
  ),
});

export async function exportBackup(db: SQLiteDatabase): Promise<string> {
  const sources = await db.getAllAsync<{
    id: string;
    type: 'text' | 'image' | 'manual';
    original_text: string | null;
    image_uri: string | null;
    message_date: string | null;
    created_at: string;
  }>('SELECT id, type, original_text, image_uri, message_date, created_at FROM sources');
  const itemRows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM schedule_items');
  const items = itemRows.map(mapBackupItem);
  const changeRows = await db.getAllAsync<{
    id: string;
    item_id: string;
    source_id: string | null;
    change_type: 'rescheduled' | 'relocated' | 'extended' | 'cancelled';
    before_snapshot: string;
    after_snapshot: string;
    created_at: string;
  }>('SELECT * FROM schedule_changes');
  const backup: GradFlowBackup = {
    format: 'gradflow-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    sources: sources.map((source) => ({
      id: source.id,
      type: source.type,
      originalText: source.original_text,
      imageUri: null,
      // 本地图片不嵌入JSON，避免备份体积和隐私风险。
      imageUris: [],
      messageDate: source.message_date,
      createdAt: source.created_at,
    })),
    items,
    changes: changeRows.map((change) => ({
      id: change.id,
      itemId: change.item_id,
      sourceId: change.source_id,
      changeType: change.change_type,
      beforeSnapshot: persistedScheduleItemSchema.parse(JSON.parse(change.before_snapshot)),
      afterSnapshot: persistedScheduleItemSchema.parse(JSON.parse(change.after_snapshot)),
      createdAt: change.created_at,
    })),
  };
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(json: string): GradFlowBackup {
  if (json.length > 5_000_000) {
    throw new Error('备份超过5MB，请确认文件是否来自研程');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('备份不是有效JSON');
  }
  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`备份格式不正确：${result.error.issues[0]?.message ?? '未知字段错误'}`);
  }
  return result.data;
}

export async function replaceFromBackup(
  db: SQLiteDatabase,
  backup: GradFlowBackup,
): Promise<{ notificationIds: string[]; imageUris: string[] }> {
  const reminders = await db.getAllAsync<{ notification_id: string }>(
    'SELECT notification_id FROM reminders',
  );
  const imageRows = await db.getAllAsync<{ image_uris: string }>(
    'SELECT image_uris FROM sources',
  );
  const imageUris = imageRows.flatMap(({ image_uris }) => {
    try {
      const parsed: unknown = JSON.parse(image_uris);
      return Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')
        ? parsed
        : [];
    } catch {
      return [];
    }
  });

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM schedule_changes;
      DELETE FROM reminders;
      DELETE FROM schedule_items;
      DELETE FROM sources;
    `);
    for (const source of backup.sources) {
      await db.runAsync(
        `INSERT INTO sources (
          id, type, original_text, image_uri, image_uris, message_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        source.id,
        source.type,
        source.originalText,
        null,
        '[]',
        source.messageDate,
        source.createdAt,
      );
    }
    for (const item of backup.items) {
      await db.runAsync(
        `INSERT INTO schedule_items (
          id, source_id, related_item_id, type, title, course, start_at, due_at,
          location, submission_method, requirements, source_quote, original_time_text,
          confidence, uncertain_fields, change_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.sourceId,
        item.relatedItemId,
        item.type,
        item.title,
        item.course,
        item.startAt,
        item.dueAt,
        item.location,
        item.submissionMethod,
        JSON.stringify(item.requirements),
        item.sourceQuote,
        item.originalTimeText,
        item.confidence,
        JSON.stringify(item.uncertainFields),
        item.changeType,
        item.status,
        item.createdAt,
        item.updatedAt,
      );
    }
    for (const change of backup.changes) {
      await db.runAsync(
        `INSERT INTO schedule_changes (
          id, item_id, source_id, change_type, before_snapshot, after_snapshot, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        change.id,
        change.itemId,
        change.sourceId,
        change.changeType,
        JSON.stringify(change.beforeSnapshot),
        JSON.stringify(change.afterSnapshot),
        change.createdAt,
      );
    }
  });

  return {
    notificationIds: reminders.map(({ notification_id }) => notification_id),
    imageUris,
  };
}

function mapBackupItem(row: Record<string, unknown>) {
  return persistedScheduleItemSchema.parse({
    id: row.id,
    sourceId: row.source_id,
    relatedItemId: row.related_item_id,
    type: row.type,
    title: row.title,
    course: row.course,
    startAt: row.start_at,
    dueAt: row.due_at,
    location: row.location,
    submissionMethod: row.submission_method,
    requirements: parseArray(row.requirements),
    sourceQuote: row.source_quote,
    originalTimeText: row.original_time_text,
    confidence: row.confidence,
    uncertainFields: parseArray(row.uncertain_fields),
    changeType: row.change_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parseArray(value: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}
