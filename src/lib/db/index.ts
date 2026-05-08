import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as sqliteSchema from './schema';
import * as pgSchema from './schema.pg';

const dbType = process.env.DATABASE_TYPE || 'sqlite';

export const isPostgres = dbType === 'postgres';

let db: BetterSQLite3Database<typeof sqliteSchema>;

if (isPostgres) {
  const postgres = require('postgres');
  const client = postgres(process.env.DATABASE_URL!);
  db = drizzlePostgres(client, { schema: pgSchema }) as unknown as BetterSQLite3Database<typeof sqliteSchema>;
} else {
  const Database = require('better-sqlite3');
  const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db');
  sqlite.pragma('journal_mode = WAL');
  db = drizzle(sqlite, { schema: sqliteSchema });
}

export const {
  users,
  floors,
  places,
  tags,
  placeTags,
  reservations,
  reservationHistories,
  calendarSettings,
  externalEvents,
  syncLogs,
} = isPostgres ? pgSchema : (sqliteSchema as any);

/**
 * DB 환경(SQLite vs PostgreSQL)에 따라 Date 타입을 적절히 변환합니다.
 */
export function toDbDate(date: Date) {
  return isPostgres ? Math.floor(date.getTime() / 1000) : date;
}

/**
 * DB에서 가져온 값을 Date 객체로 변환합니다.
 */
export function fromDbDate(value: any): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value * 1000);
  return new Date(value);
}

export { db };
export { pgSchema, sqliteSchema };
