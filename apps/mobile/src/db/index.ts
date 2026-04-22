import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

const DB_NAME = 'pokimate.db';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(SCHEMA_SQL);
  return _db;
}

export function closeDb() {
  _db?.closeAsync();
  _db = null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

// ── DB file path (for export/import) ─────────────────────────────────────────
import * as FileSystem from 'expo-file-system';

export function getDbPath(): string {
  // expo-sqlite stores DBs in the app's document directory
  return `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
}

// ── Replace DB with imported file ─────────────────────────────────────────────
export async function replaceDbWithFile(sourcePath: string): Promise<void> {
  const destDir = `${FileSystem.documentDirectory}SQLite/`;
  const destPath = `${destDir}${DB_NAME}`;

  // Close current connection
  closeDb();

  // Ensure directory exists
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });

  // Copy imported file over the existing db
  await FileSystem.copyAsync({ from: sourcePath, to: destPath });

  // Re-open and run migrations (safe — all are CREATE IF NOT EXISTS)
  await getDb();
}
