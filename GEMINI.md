# Project patterns & Lessons Learned

## Database & Dates
- **Unified Date Format**: Always use **Unix Seconds (Integer)** for date columns in both SQLite and PostgreSQL.
- **Drizzle Schema**:
  - SQLite: Use `integer('column_name')` without `mode: 'timestamp'`.
  - PostgreSQL: Use `integer('column_name')`.
  - Default values: Use `sql`(strftime('%s', 'now'))` for SQLite.
- **Conversion Utilities**: Always use `toDbDate()` and `fromDbDate()` from `@/lib/db/db-utils` for all DB read/write operations. **Never use `new Date(value)` directly on DB integers.**
- **Client Components**: Import `fromDbDate` from `@/lib/db/db-utils` to avoid importing server-only modules like `better-sqlite3`.

## Reservation Cancellation
- **Soft Delete Pattern**: Reservations should not be hard-deleted. Use the `status` field (`active`, `cancelled`).
- **Conflict Checks**: Always filter by `status = 'active'` when checking for time slot overlaps.
- **Detail Views**: Ensure cancelled reservations remain accessible for history and detail purposes.

## UI & Styling
- **Word Wrapping**: Use `break-keep` (or `word-break: keep-all`) for Korean text to prevent unnatural mid-word line breaks.
