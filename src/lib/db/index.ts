import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db');

// WAL(Write-Ahead Logging) 모드 활성화 - 성능 및 동시성 향상
sqlite.pragma('journal_mode = WAL');
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS reservation_histories (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    reservation_id integer NOT NULL,
    actor_user_id integer NOT NULL,
    actor_user_name text NOT NULL,
    action_type text DEFAULT 'updated' NOT NULL,
    changes text NOT NULL,
    created_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL
  )
`);

export const db = drizzle(sqlite, { schema });
