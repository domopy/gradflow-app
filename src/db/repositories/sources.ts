import type { SQLiteDatabase } from 'expo-sqlite';

import type { Source, SourceInput } from '@/types/source';
import { createId } from '@/utils/id';

interface SourceRow {
  id: string;
  type: Source['type'];
  original_text: string | null;
  image_uri: string | null;
  image_uris: string;
  message_date: string | null;
  created_at: string;
}

export async function createSource(
  db: SQLiteDatabase,
  input: SourceInput,
): Promise<string> {
  const id = createId('source');
  await db.runAsync(
    `INSERT INTO sources (
      id, type, original_text, image_uri, image_uris, message_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.type,
    input.originalText ?? null,
    input.imageUri ?? null,
    JSON.stringify(input.imageUris ?? []),
    input.messageDate ?? null,
    new Date().toISOString(),
  );
  return id;
}

export async function deleteSourceIfOrphaned(
  db: SQLiteDatabase,
  sourceId: string,
): Promise<string[]> {
  const count = await db.getFirstAsync<{ count: number }>(
    `SELECT (
      (SELECT COUNT(*) FROM schedule_items WHERE source_id = ?) +
      (SELECT COUNT(*) FROM schedule_changes WHERE source_id = ?)
    ) AS count`,
    sourceId,
    sourceId,
  );
  if ((count?.count ?? 0) > 0) {
    return [];
  }

  const source = await db.getFirstAsync<{ image_uris: string }>(
    'SELECT image_uris FROM sources WHERE id = ?',
    sourceId,
  );
  await db.runAsync('DELETE FROM sources WHERE id = ?', sourceId);

  return parseImageUris(source?.image_uris);
}

export async function getSource(
  db: SQLiteDatabase,
  sourceId: string,
): Promise<Source | null> {
  const row = await db.getFirstAsync<SourceRow>(
    `SELECT id, type, original_text, image_uri, image_uris, message_date, created_at
     FROM sources
     WHERE id = ?`,
    sourceId,
  );
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    type: row.type,
    originalText: row.original_text,
    imageUri: row.image_uri,
    imageUris: parseImageUris(row.image_uris),
    messageDate: row.message_date,
    createdAt: row.created_at,
  };
}

export function parseImageUris(value: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}
