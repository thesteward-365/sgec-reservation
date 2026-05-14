import {
  pgTable,
  text,
  integer,
  serial,
  primaryKey,
  pgEnum,
  timestamp, // 추가
  boolean, // 추가
} from 'drizzle-orm/pg-core';

// Enum 정의
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const userStatusEnum = pgEnum('user_status', [
  'pending',
  'approved',
  'rejected',
]);
export const reservationStatusEnum = pgEnum('reservation_status', [
  'active',
  'cancelled',
]);
export const syncRunStatusEnum = pgEnum('sync_run_status', [
  'success',
  'partial',
  'failed',
  'skipped',
]);
export const syncCategoryEnum = pgEnum('sync_category', [
  'reservation',
  'event',
]);
export const syncActionEnum = pgEnum('sync_action', [
  'created',
  'updated',
  'cancelled',
]);
export const syncTriggerEnum = pgEnum('sync_trigger', ['manual', 'system']);
export const syncCalendarStatusEnum = pgEnum('sync_calendar_status', [
  'success',
  'failed',
  'skipped',
]);

// 1. 유저 테이블
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phoneNumber: text('phone_number').notNull().unique(),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('pending'),
  // timestamp로 변경: 자동으로 Date 객체로 매핑됨
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 2. 층 테이블
export const floors = pgTable('floors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
});

// 3. 장소 테이블
export const places = pgTable('places', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  floorId: integer('floor_id')
    .notNull()
    .references(() => floors.id, { onDelete: 'cascade' }),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  // PostgreSQL은 boolean 타입을 지원하므로 변경
  isPinned: boolean('is_pinned').notNull().default(false),
});

// 4. 태그 및 매핑
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const placeTags = pgTable(
  'place_tags',
  {
    placeId: integer('place_id')
      .notNull()
      .references(() => places.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.placeId, table.tagId] })]
);

// 5. 예약 테이블
export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  placeId: integer('place_id')
    .notNull()
    .references(() => places.id, { onDelete: 'cascade' }),
  // 시간을 timestamp로 변경 (Google Calendar 연동 시 매우 편리)
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  purpose: text('purpose').notNull(),
  status: reservationStatusEnum('status').notNull().default('active'),
  googleEventId: text('google_event_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 6. 예약 이력
export const reservationHistories = pgTable('reservation_histories', {
  id: serial('id').primaryKey(),
  reservationId: integer('reservation_id').notNull(),
  actorUserId: integer('actor_user_id').notNull(),
  actorUserName: text('actor_user_name').notNull(),
  actionType: text('action_type').notNull().default('updated'),
  changes: text('changes').notNull(),
  googleEventId: text('google_event_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 7. 캘린더 설정
export const calendarSettings = pgTable('calendar_settings', {
  id: serial('id').primaryKey(),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: timestamp('google_token_expiry', { withTimezone: true }),
  calendarId: text('calendar_id'),
  eventCalendarId: text('event_calendar_id'),
  connectedEmail: text('connected_email'),
});

// 8. 외부 이벤트 (동기화용)
export const externalEvents = pgTable('external_events', {
  id: serial('id').primaryKey(),
  googleEventId: text('google_event_id').notNull().unique(),
  title: text('title').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  description: text('description'),
  syncedAt: timestamp('synced_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 9. 동기화 로그
export const syncLogs = pgTable('sync_logs', {
  id: serial('id').primaryKey(),
  runId: text('run_id').references(() => calendarSyncRuns.id, {
    onDelete: 'cascade',
  }),
  level: text('level').notNull().default('info'),
  message: text('message').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 10. 동기화 실행 단위
export const calendarSyncRuns = pgTable('calendar_sync_runs', {
  id: text('id').primaryKey(),
  triggeredBy: syncTriggerEnum('triggered_by').notNull().default('manual'),
  startedAt: timestamp('started_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: syncRunStatusEnum('status').notNull().default('success'),
  reservationSyncStatus: syncCalendarStatusEnum(
    'reservation_sync_status'
  ).notNull(),
  eventSyncStatus: syncCalendarStatusEnum('event_sync_status').notNull(),
  reservationCreatedCount: integer('reservation_created_count')
    .notNull()
    .default(0),
  reservationUpdatedCount: integer('reservation_updated_count')
    .notNull()
    .default(0),
  reservationDeletedCount: integer('reservation_deleted_count')
    .notNull()
    .default(0),
  eventPulledCount: integer('event_pulled_count').notNull().default(0),
  failedCount: integer('failed_count').notNull().default(0),
  errorSummary: text('error_summary'),
});

// 11. 동기화 실행 내 개별 항목
export const calendarSyncItems = pgTable('calendar_sync_items', {
  id: serial('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => calendarSyncRuns.id, { onDelete: 'cascade' }),
  category: syncCategoryEnum('category').notNull(),
  action: syncActionEnum('action').notNull(),
  status: syncRunStatusEnum('status').notNull(),
  reservationId: integer('reservation_id'),
  externalEventId: text('external_event_id'),
  title: text('title').notNull(),
  payload: text('payload'),
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
