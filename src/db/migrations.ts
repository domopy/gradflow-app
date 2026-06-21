import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 3;

export async function migrateDatabase(db: SQLiteDatabase) {
  // 连接级PRAGMA需要每次打开数据库时设置，不能只依赖首次建库。
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        original_text TEXT,
        image_uri TEXT,
        image_uris TEXT NOT NULL DEFAULT '[]',
        message_date TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schedule_items (
        id TEXT PRIMARY KEY NOT NULL,
        source_id TEXT,
        related_item_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        course TEXT,
        start_at TEXT,
        due_at TEXT,
        location TEXT,
        submission_method TEXT,
        requirements TEXT NOT NULL DEFAULT '[]',
        source_quote TEXT,
        original_time_text TEXT,
        confidence REAL,
        uncertain_fields TEXT NOT NULL DEFAULT '[]',
        change_type TEXT NOT NULL DEFAULT 'created',
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_schedule_items_start_at
        ON schedule_items(start_at);
      CREATE INDEX IF NOT EXISTS idx_schedule_items_due_at
        ON schedule_items(due_at);
      CREATE INDEX IF NOT EXISTS idx_schedule_items_status
        ON schedule_items(status);

      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        remind_at TEXT NOT NULL,
        notification_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES schedule_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_reminders_item_id
        ON reminders(item_id);

      CREATE TABLE IF NOT EXISTS schedule_changes (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        source_id TEXT,
        change_type TEXT NOT NULL,
        before_snapshot TEXT NOT NULL,
        after_snapshot TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES schedule_items(id) ON DELETE CASCADE,
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_schedule_changes_item_id
        ON schedule_changes(item_id);
    `);
  }

  if (currentVersion === 1) {
    await db.execAsync(
      "ALTER TABLE sources ADD COLUMN image_uris TEXT NOT NULL DEFAULT '[]'",
    );
  }

  if (currentVersion >= 1 && currentVersion < 3) {
    await db.execAsync(`
      ALTER TABLE schedule_items ADD COLUMN related_item_id TEXT;
      CREATE TABLE IF NOT EXISTS schedule_changes (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        source_id TEXT,
        change_type TEXT NOT NULL,
        before_snapshot TEXT NOT NULL,
        after_snapshot TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES schedule_items(id) ON DELETE CASCADE,
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_schedule_changes_item_id
        ON schedule_changes(item_id);
    `);
  }

  if (currentVersion < DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}
