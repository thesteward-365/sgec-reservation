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
    created_at integer DEFAULT (unixepoch()) NOT NULL
  )
`);

// 취소 이력에 googleEventId 컬럼 추가 (없으면)
try { sqlite.exec(`ALTER TABLE reservation_histories ADD COLUMN google_event_id text`); } catch { /* already exists */ }

// CURRENT_TIMESTAMP로 잘못 저장된 텍스트 날짜를 Unix 정수로 변환
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

export const db = drizzle(sqlite, { schema });
