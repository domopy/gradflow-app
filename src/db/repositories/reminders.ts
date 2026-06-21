import type { SQLiteDatabase } from 'expo-sqlite';

import type { Reminder } from '@/types/schedule';
import { createId } from '@/utils/id';

interface ReminderRow {
  id: string;
  item_id: string;
  remind_at: string;
  notification_id: string;
  created_at: string;
}

export async function getReminderForItem(
  db: SQLiteDatabase,
  itemId: string,
): Promise<Reminder | null> {
  const row = await db.getFirstAsync<ReminderRow>(
    'SELECT * FROM reminders WHERE item_id = ? LIMIT 1',
    itemId,
  );

  return row
    ? {
        id: row.id,
        itemId: row.item_id,
        remindAt: row.remind_at,
        notificationId: row.notification_id,
        createdAt: row.created_at,
      }
    : null;
}

export async function replaceReminder(
  db: SQLiteDatabase,
  itemId: string,
  remindAt: string,
  notificationId: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM reminders WHERE item_id = ?', itemId);
    await db.runAsync(
      `INSERT INTO reminders (id, item_id, remind_at, notification_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      createId('reminder'),
      itemId,
      remindAt,
      notificationId,
      new Date().toISOString(),
    );
  });
}

export async function deleteReminderRecord(
  db: SQLiteDatabase,
  itemId: string,
): Promise<void> {
  await db.runAsync('DELETE FROM reminders WHERE item_id = ?', itemId);
}
