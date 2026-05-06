import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as sqliteSchema from './schema';
import * as pgSchema from './schema.pg';

const dbType = process.env.DATABASE_TYPE || 'sqlite';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: BetterSQLite3Database<typeof sqliteSchema> | PostgresJsDatabase<any>;

if (dbType === 'postgres') {
  const postgres = require('postgres');
  const client = postgres(process.env.DATABASE_URL!);
  db = drizzlePostgres(client, { schema: pgSchema });
} else {
  const Database = require('better-sqlite3');
  const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db');

  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS reservation_histories (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      reservation_id integer NOT NULL,
      actor_user_id integer NOT NULL,
      actor_user_name text NOT NULL,
      action_type text DEFAULT 'updated' NOT NULL,
      changes text NOT NULL,
      created_at integer DEFAULT (unixepoch()) NOT NULL
    )
  `);

  try {
    sqlite.exec(
      `ALTER TABLE reservation_histories ADD COLUMN google_event_id text`
    );
  } catch {
    /* already exists */
  }

  sqlite.exec(`
    UPDATE sync_logs
    SET timestamp = strftime('%s', timestamp)
    WHERE typeof(timestamp) = 'text'
  `);
  sqlite.exec(`
    UPDATE reservation_histories
    SET created_at = strftime('%s', created_at)
    WHERE typeof(created_at) = 'text'
  `);
  sqlite.exec(`
    UPDATE users
    SET created_at = strftime('%s', created_at)
    WHERE typeof(created_at) = 'text'
  `);
  sqlite.exec(`
    UPDATE reservations
    SET created_at = strftime('%s', created_at)
    WHERE typeof(created_at) = 'text'
  `);

  db = drizzle(sqlite, { schema: sqliteSchema });
}

export { db };
export { pgSchema, sqliteSchema };
