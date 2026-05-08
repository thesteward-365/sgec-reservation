import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phoneNumber: text('phone_number').notNull().unique(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`((strftime('%s', 'now') * 1000))`),
});

export const floors = sqliteTable('floors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // e.g., "1층", "B1층"
  order: integer('order').notNull().default(0),
});

export const places = sqliteTable('places', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  floorId: integer('floor_id')
    .notNull()
    .references(() => floors.id, { onDelete: 'cascade' }),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPinned: integer('is_pinned').notNull().default(0),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const placeTags = sqliteTable('place_tags', {
  placeId: integer('place_id')
    .notNull()
    .references(() => places.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.placeId, t.tagId] }),
}));

export const reservations = sqliteTable('reservations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  placeId: integer('place_id')
    .notNull()
    .references(() => places.id, { onDelete: 'cascade' }),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
  purpose: text('purpose').notNull(),
  googleEventId: text('google_event_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`((strftime('%s', 'now') * 1000))`),
});

export const reservationHistories = sqliteTable('reservation_histories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reservationId: integer('reservation_id').notNull(),
  actorUserId: integer('actor_user_id').notNull(),
  actorUserName: text('actor_user_name').notNull(),
  actionType: text('action_type', {
    enum: ['created', 'updated', 'cancelled'],
  })
    .notNull()
    .default('updated'),
  changes: text('changes').notNull(),
  googleEventId: text('google_event_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`((strftime('%s', 'now') * 1000))`),
});

export const calendarSettings = sqliteTable('calendar_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: integer('google_token_expiry'),
  calendarId: text('calendar_id'),
  eventCalendarId: text('event_calendar_id'),
  connectedEmail: text('connected_email'),
});

export const externalEvents = sqliteTable('external_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  googleEventId: text('google_event_id').notNull().unique(),
  title: text('title').notNull(),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
  description: text('description'),
  syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull().default(sql`((strftime('%s', 'now') * 1000))`),
});

export const syncLogs = sqliteTable('sync_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level', { enum: ['info', 'error'] }).notNull().default('info'),
  message: text('message').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`((strftime('%s', 'now') * 1000))`),
});
