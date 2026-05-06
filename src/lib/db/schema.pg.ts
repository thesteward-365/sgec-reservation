import { pgTable, text, integer, serial, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const NOW = sql`extract(epoch from now())::integer`;

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phoneNumber: text('phone_number').notNull().unique(),
  role: text('role').notNull().default('user'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull().default(NOW),
});

export const floors = pgTable('floors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
});

export const places = pgTable('places', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  floorId: integer('floor_id').notNull().references(() => floors.id, { onDelete: 'cascade' }),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPinned: integer('is_pinned').notNull().default(0),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const placeTags = pgTable('place_tags', {
  placeId: integer('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.placeId, t.tagId] }),
}));

export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  placeId: integer('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time').notNull(),
  purpose: text('purpose').notNull(),
  googleEventId: text('google_event_id'),
  createdAt: integer('created_at').notNull().default(NOW),
});

export const reservationHistories = pgTable('reservation_histories', {
  id: serial('id').primaryKey(),
  reservationId: integer('reservation_id').notNull(),
  actorUserId: integer('actor_user_id').notNull(),
  actorUserName: text('actor_user_name').notNull(),
  actionType: text('action_type').notNull().default('updated'),
  changes: text('changes').notNull(),
  googleEventId: text('google_event_id'),
  createdAt: integer('created_at').notNull().default(NOW),
});

export const calendarSettings = pgTable('calendar_settings', {
  id: serial('id').primaryKey(),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: integer('google_token_expiry'),
  calendarId: text('calendar_id'),
  eventCalendarId: text('event_calendar_id'),
  connectedEmail: text('connected_email'),
});

export const externalEvents = pgTable('external_events', {
  id: serial('id').primaryKey(),
  googleEventId: text('google_event_id').notNull().unique(),
  title: text('title').notNull(),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time').notNull(),
  description: text('description'),
  syncedAt: integer('synced_at').notNull().default(NOW),
});

export const syncLogs = pgTable('sync_logs', {
  id: serial('id').primaryKey(),
  level: text('level').notNull().default('info'),
  message: text('message').notNull(),
  timestamp: integer('timestamp').notNull().default(NOW),
});
