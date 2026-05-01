import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db');

// WAL(Write-Ahead Logging) 모드 활성화 - 성능 및 동시성 향상
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
