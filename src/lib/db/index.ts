import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as sqliteSchema from './schema';
import * as pgSchema from './schema.pg';

const dbType = process.env.DATABASE_TYPE || 'sqlite';

let db: BetterSQLite3Database<typeof sqliteSchema>;

if (dbType === 'postgres') {
  const postgres = require('postgres');
  const client = postgres(process.env.DATABASE_URL!);
  db = drizzlePostgres(client, { schema: pgSchema }) as unknown as BetterSQLite3Database<typeof sqliteSchema>;
} else {
  const Database = require('better-sqlite3');
  const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db');
  sqlite.pragma('journal_mode = WAL');
  db = drizzle(sqlite, { schema: sqliteSchema });
}

export { db };
export { pgSchema, sqliteSchema };
