import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as sqliteSchema from './schema';
import * as pgSchema from './schema.pg';
import { toDbDate, fromDbDate } from './db-utils';

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

export { db, toDbDate, fromDbDate };
export { pgSchema, sqliteSchema };
