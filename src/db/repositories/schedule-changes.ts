import type { SQLiteDatabase } from 'expo-sqlite';

import type { ChangeType, ScheduleChange, ScheduleItem } from '@/types/schedule';
import { createId } from '@/utils/id';

interface ChangeRow {
  id: string;
  item_id: string;
  source_id: string | null;
  change_type: Exclude<ChangeType, 'created'>;
  before_snapshot: string;
  after_snapshot: string;
  created_at: string;
}

export async function createScheduleChange(
  db: SQLiteDatabase,
  itemId: string,
  sourceId: string,
  changeType: Exclude<ChangeType, 'created'>,
  before: ScheduleItem,
  after: ScheduleItem,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO schedule_changes (
      id, item_id, source_id, change_type, before_snapshot, after_snapshot, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    createId('change'),
    itemId,
    sourceId,
    changeType,
    JSON.stringify(before),
    JSON.stringify(after),
    new Date().toISOString(),
  );
}

export async function listScheduleChanges(
  db: SQLiteDatabase,
  itemId: string,
): Promise<ScheduleChange[]> {
  const rows = await db.getAllAsync<ChangeRow>(
    'SELECT * FROM schedule_changes WHERE item_id = ? ORDER BY created_at DESC',
    itemId,
  );
  return rows.flatMap((row) => {
    try {
      return [{
        id: row.id,
        itemId: row.item_id,
        sourceId: row.source_id,
        changeType: row.change_type,
        beforeSnapshot: JSON.parse(row.before_snapshot) as ScheduleItem,
        afterSnapshot: JSON.parse(row.after_snapshot) as ScheduleItem,
        createdAt: row.created_at,
      }];
    } catch {
      return [];
    }
  });
}

export async function listChangeSourceIds(
  db: SQLiteDatabase,
  itemId: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ source_id: string }>(
    'SELECT DISTINCT source_id FROM schedule_changes WHERE item_id = ? AND source_id IS NOT NULL',
    itemId,
  );
  return rows.map(({ source_id }) => source_id);
}
