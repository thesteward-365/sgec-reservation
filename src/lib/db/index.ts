import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as pgSchema from './schema';
import { toDbDate, fromDbDate } from './db-utils';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  prepare: false,
});

export const db = drizzle(client, {
  schema: pgSchema,
});

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
} = pgSchema;

export { toDbDate, fromDbDate };
export { pgSchema };
