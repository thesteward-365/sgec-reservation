import { randomUUID } from 'crypto';

import { getCalendarClient, getCalendarSettings } from './google-client';
import { db } from '@/lib/db';
import {
  reservations,
  externalEvents,
  syncLogs,
  calendarSettings,
  reservationHistories,
  places,
  users,
  calendarSyncRuns,
  calendarSyncItems,
} from '@/lib/db';
import { eq, and, gte, sql, isNotNull, desc } from 'drizzle-orm';
import { calendar_v3 } from 'googleapis';

type ReservationRow = {
  id: number;
  startTime: Date;
  endTime: Date;
  purpose: string;
  placeName: string;
  userName: string;
  googleEventId: string | null;
};

type SyncRunStatus = 'success' | 'partial' | 'failed';
type SyncCalendarStatus = 'success' | 'failed' | 'skipped';
type SyncTrigger = 'manual' | 'system';
type SyncCategory = 'reservation' | 'event';
type SyncAction = 'created' | 'updated' | 'cancelled';

export type SyncItemResult = {
  category: SyncCategory;
  action: SyncAction;
  status: 'success' | 'failed';
  reservationId?: number;
  externalEventId?: string;
  title: string;
  payload?: Record<string, unknown>;
  errorMessage?: string;
  processedAt?: Date;
};

type SyncScopeResult = {
  status: SyncCalendarStatus;
  counts: {
    created: number;
    updated: number;
    deleted: number;
    pulled: number;
    failed: number;
  };
  items: SyncItemResult[];
  errors: string[];
};

export type SyncResult = {
  runId: string;
  status: SyncRunStatus;
  reservationSyncStatus: SyncCalendarStatus;
  eventSyncStatus: SyncCalendarStatus;
  counts: {
    reservationCreated: number;
    reservationUpdated: number;
    reservationDeleted: number;
    eventPulled: number;
    failed: number;
  };
  items: SyncItemResult[];
  errors: string[];
};

export type CalendarSyncRunSummary = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: SyncRunStatus;
  reservationSyncStatus: SyncCalendarStatus;
  eventSyncStatus: SyncCalendarStatus;
  counts: {
    reservationCreated: number;
    reservationUpdated: number;
    reservationDeleted: number;
    eventPulled: number;
    failed: number;
  };
};

export type CalendarSyncRunDetail = CalendarSyncRunSummary & {
  triggeredBy: SyncTrigger;
  items: Array<{
    id: number;
    category: SyncCategory;
    action: SyncAction;
    status: 'success' | 'failed';
    reservationId: number | null;
    externalEventId: string | null;
    title: string;
    payload: Record<string, unknown> | null;
    errorMessage: string | null;
    processedAt: string;
  }>;
};

function buildEventBody(reservation: ReservationRow): calendar_v3.Schema$Event {
  return {
    summary: `${reservation.placeName}•${reservation.purpose}`,
    description: `예약자: ${reservation.userName}\n목적: ${reservation.purpose}\n장소: ${reservation.placeName}`,
    location: reservation.placeName,
    start: {
      dateTime: reservation.startTime.toISOString(),
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: reservation.endTime.toISOString(),
      timeZone: 'Asia/Seoul',
    },
  };
}

async function logSync(level: 'info' | 'error', message: string) {
  await db.insert(syncLogs).values({ level, message });
}

function reservationTitle(row: {
  placeName: string | null | undefined;
  purpose: string | null | undefined;
  id?: number;
}) {
  if (row.placeName && row.purpose) {
    return `${row.placeName} · ${row.purpose}`;
  }

  if (row.placeName) return row.placeName;
  if (row.purpose) return row.purpose;
  return row.id ? `예약 #${row.id}` : '예약';
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) return undefined;
  const withStatus = error as {
    code?: number | string;
    response?: { status?: number };
    status?: number;
  };
  return withStatus.code ?? withStatus.response?.status ?? withStatus.status;
}

function buildReservationPayload(row: ReservationRow) {
  return {
    reservationId: row.id,
    placeName: row.placeName,
    purpose: row.purpose,
    userName: row.userName,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
  };
}

function computeScopeStatus(
  counts: SyncScopeResult['counts'],
  errors: string[]
): SyncCalendarStatus {
  const processedTotal =
    counts.created + counts.updated + counts.deleted + counts.pulled;

  if (processedTotal === 0 && errors.length === 0) {
    return 'skipped';
  }

  if (errors.length === 0) {
    return 'success';
  }

  if (processedTotal === 0) {
    return 'failed';
  }

  return 'failed';
}

function computeRunStatus(
  reservation: SyncScopeResult,
  event: SyncScopeResult
): SyncRunStatus {
  const totalFailures = reservation.counts.failed + event.counts.failed;
  const totalSuccesses =
    reservation.counts.created +
    reservation.counts.updated +
    reservation.counts.deleted +
    event.counts.pulled;

  if (totalFailures === 0) return 'success';
  if (totalSuccesses === 0) return 'failed';
  return 'partial';
}

function summarizeErrors(errors: string[]) {
  if (errors.length === 0) return null;
  return errors.slice(0, 3).join(' | ');
}

function parseHistoryChanges(
  changes: string | null | undefined
): Record<string, unknown> | null {
  if (!changes) return null;
  try {
    return JSON.parse(changes);
  } catch {
    return null;
  }
}

async function getLatestReservationHistoryPayload(
  reservationId: number,
  actionType: 'created' | 'updated'
) {
  const [history] = await db
    .select({ changes: reservationHistories.changes })
    .from(reservationHistories)
    .where(
      and(
        eq(reservationHistories.reservationId, reservationId),
        eq(reservationHistories.actionType, actionType)
      )
    )
    .orderBy(desc(reservationHistories.createdAt))
    .limit(1);

  const parsed = parseHistoryChanges(history?.changes) as
    | Record<string, unknown>
    | null;
  if (!parsed) return null;

  if (actionType === 'created') {
    const created = parsed.created as { to?: Record<string, unknown> } | undefined;
    return created?.to ?? (parsed.snapshot as Record<string, unknown> | undefined) ?? parsed;
  }

  return parsed;
}

export async function createGoogleEvent(
  reservationId: number
): Promise<string | null> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) return null;

  const [row] = await db
    .select({
      id: reservations.id,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      googleEventId: reservations.googleEventId,
      placeName: places.name,
      userName: users.name,
    })
    .from(reservations)
    .innerJoin(places, eq(reservations.placeId, places.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!row) return null;

  try {
    const event = await calendar.events.insert({
      calendarId: settings.calendarId,
      requestBody: buildEventBody(row),
    });

    const eventId = event.data.id!;
    await db
      .update(reservations)
      .set({ googleEventId: eventId })
      .where(eq(reservations.id, reservationId));

    await logSync(
      'info',
      `예약 #${reservationId} Google 이벤트 생성: ${eventId}`
    );
    return eventId;
  } catch (e) {
    await logSync(
      'error',
      `예약 #${reservationId} Google 이벤트 생성 실패: ${String(e)}`
    );
    return null;
  }
}

export async function updateGoogleEvent(reservationId: number): Promise<void> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) return;

  const [row] = await db
    .select({
      id: reservations.id,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      googleEventId: reservations.googleEventId,
      placeName: places.name,
      userName: users.name,
    })
    .from(reservations)
    .innerJoin(places, eq(reservations.placeId, places.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!row?.googleEventId) {
    await createGoogleEvent(reservationId);
    return;
  }

  try {
    await calendar.events.update({
      calendarId: settings.calendarId,
      eventId: row.googleEventId,
      requestBody: buildEventBody(row),
    });
    await logSync(
      'info',
      `예약 #${reservationId} Google 이벤트 업데이트: ${row.googleEventId}`
    );
  } catch (e) {
    await logSync(
      'error',
      `예약 #${reservationId} Google 이벤트 업데이트 실패: ${String(e)}`
    );
  }
}

export async function deleteGoogleEvent(googleEventId: string): Promise<void> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId || !googleEventId) return;

  try {
    await calendar.events.delete({
      calendarId: settings.calendarId,
      eventId: googleEventId,
    });
    await logSync('info', `Google 이벤트 삭제: ${googleEventId}`);
  } catch (e) {
    await logSync(
      'error',
      `Google 이벤트 삭제 실패 (${googleEventId}): ${String(e)}`
    );
  }
}

async function pushReservationsDetailed(): Promise<SyncScopeResult> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) {
    return {
      status: 'skipped',
      counts: { created: 0, updated: 0, deleted: 0, pulled: 0, failed: 0 },
      items: [],
      errors: [],
    };
  }

  const pending = await db
    .select({
      id: reservations.id,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      googleEventId: reservations.googleEventId,
      placeName: places.name,
      userName: users.name,
    })
    .from(reservations)
    .innerJoin(places, eq(reservations.placeId, places.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(
      and(
        eq(reservations.status, 'active'),
        gte(reservations.endTime, sql`now()`)
      )
    );

  const result: SyncScopeResult = {
    status: 'skipped',
    counts: { created: 0, updated: 0, deleted: 0, pulled: 0, failed: 0 },
    items: [],
    errors: [],
  };

  for (const row of pending) {
    const title = reservationTitle(row);
    const action: SyncAction = row.googleEventId ? 'updated' : 'created';

    try {
      let eventId = row.googleEventId;

      if (row.googleEventId) {
        try {
          await calendar.events.update({
            calendarId: settings.calendarId,
            eventId: row.googleEventId,
            requestBody: buildEventBody(row),
          });
        } catch (error) {
          const status = getErrorStatus(error);

          if (status === 404 || status === 410) {
            const recreated = await calendar.events.insert({
              calendarId: settings.calendarId,
              requestBody: buildEventBody(row),
            });
            eventId = recreated.data.id!;
            await db
              .update(reservations)
              .set({ googleEventId: eventId })
              .where(eq(reservations.id, row.id));
          } else {
            throw error;
          }
        }

        result.counts.updated += 1;
        result.items.push({
          category: 'reservation',
          action: 'updated',
          status: 'success',
          reservationId: row.id,
          externalEventId: eventId ?? undefined,
          title,
          payload:
            (await getLatestReservationHistoryPayload(row.id, 'updated')) ??
            buildReservationPayload(row),
        });
      } else {
        const event = await calendar.events.insert({
          calendarId: settings.calendarId,
          requestBody: buildEventBody(row),
        });
        eventId = event.data.id!;
        await db
          .update(reservations)
          .set({ googleEventId: eventId })
          .where(eq(reservations.id, row.id));

        result.counts.created += 1;
        result.items.push({
          category: 'reservation',
          action: 'created',
          status: 'success',
          reservationId: row.id,
          externalEventId: eventId,
          title,
          payload:
            (await getLatestReservationHistoryPayload(row.id, 'created')) ??
            buildReservationPayload(row),
        });
      }
    } catch (error) {
      const payload = buildReservationPayload(row);
      const message = `예약 #${row.id} ${action === 'created' ? '생성' : '수정'} 실패: ${formatError(error)}`;
      result.counts.failed += 1;
      result.errors.push(message);
      result.items.push({
        category: 'reservation',
        action,
        status: 'failed',
        reservationId: row.id,
        externalEventId: row.googleEventId ?? undefined,
        title,
        payload,
        errorMessage: message,
      });
      await logSync('error', message);
    }
  }

  result.status = computeScopeStatus(result.counts, result.errors);
  await logSync(
    'info',
    `예약 push 완료: 생성 ${result.counts.created}건, 수정 ${result.counts.updated}건, 실패 ${result.counts.failed}건`
  );
  return result;
}

async function syncCancellationsDetailed(): Promise<SyncScopeResult> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) {
    return {
      status: 'skipped',
      counts: { created: 0, updated: 0, deleted: 0, pulled: 0, failed: 0 },
      items: [],
      errors: [],
    };
  }

  const pending = await db
    .select({
      id: reservationHistories.id,
      reservationId: reservationHistories.reservationId,
      googleEventId: reservationHistories.googleEventId,
      changes: reservationHistories.changes,
      placeName: places.name,
      purpose: reservations.purpose,
    })
    .from(reservationHistories)
    .leftJoin(
      reservations,
      eq(reservationHistories.reservationId, reservations.id)
    )
    .leftJoin(places, eq(reservations.placeId, places.id))
    .where(
      and(
        eq(reservationHistories.actionType, 'cancelled'),
        isNotNull(reservationHistories.googleEventId)
      )
    );

  const result: SyncScopeResult = {
    status: 'skipped',
    counts: { created: 0, updated: 0, deleted: 0, pulled: 0, failed: 0 },
    items: [],
    errors: [],
  };

  for (const row of pending) {
    const parsedChanges = parseHistoryChanges(row.changes) as
      | {
          snapshot?: Record<string, unknown>;
          cancelled?: { from?: Record<string, unknown> };
        }
      | null;
    const snapshot = parsedChanges?.snapshot ?? parsedChanges?.cancelled?.from;
    const title = reservationTitle({
      id: row.reservationId,
      placeName: row.placeName ?? snapshot?.placeName,
      purpose: row.purpose ?? snapshot?.purpose,
    });
    const payload = snapshot
      ? snapshot
      : {
          reservationId: row.reservationId,
        };

    try {
      await calendar.events.delete({
        calendarId: settings.calendarId,
        eventId: row.googleEventId!,
      });
      await db
        .update(reservationHistories)
        .set({ googleEventId: null })
        .where(eq(reservationHistories.id, row.id));
      result.counts.deleted += 1;
      result.items.push({
        category: 'reservation',
        action: 'cancelled',
        status: 'success',
        reservationId: row.reservationId,
        externalEventId: row.googleEventId!,
        title,
        payload,
      });
    } catch (error: unknown) {
      const status = getErrorStatus(error);

      if (status === 404 || status === 410) {
        await db
          .update(reservationHistories)
          .set({ googleEventId: null })
          .where(eq(reservationHistories.id, row.id));
        result.counts.deleted += 1;
        result.items.push({
          category: 'reservation',
          action: 'cancelled',
          status: 'success',
          reservationId: row.reservationId,
          externalEventId: row.googleEventId!,
          title,
          payload,
        });
      } else {
        const message = `취소 이벤트 삭제 실패 (${row.googleEventId}): ${formatError(error)}`;
        result.counts.failed += 1;
        result.errors.push(message);
        result.items.push({
          category: 'reservation',
          action: 'cancelled',
          status: 'failed',
          reservationId: row.reservationId,
          externalEventId: row.googleEventId!,
          title,
          payload,
          errorMessage: message,
        });
        await logSync('error', message);
      }
    }
  }

  result.status = computeScopeStatus(result.counts, result.errors);
  if (result.counts.deleted > 0 || result.counts.failed > 0) {
    await logSync(
      'info',
      `취소 이벤트 Google 삭제 완료: ${result.counts.deleted}건, 실패 ${result.counts.failed}건`
    );
  }
  return result;
}

async function pullExternalEventsDetailed(): Promise<SyncScopeResult> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.eventCalendarId) {
    return {
      status: 'skipped',
      counts: { created: 0, updated: 0, deleted: 0, pulled: 0, failed: 0 },
      items: [],
      errors: [],
    };
  }

  const result: SyncScopeResult = {
    status: 'skipped',
    counts: { created: 0, updated: 0, deleted: 0, pulled: 0, failed: 0 },
    items: [],
    errors: [],
  };

  try {
    const now = new Date();
    const oneYearLater = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate()
    );

    const allItems: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;

    do {
      const res = await calendar.events.list({
        calendarId: settings.eventCalendarId,
        timeMin: now.toISOString(),
        timeMax: oneYearLater.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
        pageToken,
      });

      allItems.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    const googleIds: string[] = [];

    for (const item of allItems) {
      if (!item.id || !item.summary) continue;

      const startStr = item.start?.dateTime ?? item.start?.date;
      const endStr = item.end?.dateTime ?? item.end?.date;
      if (!startStr || !endStr) continue;

      const startTime = new Date(startStr);
      const endTime = new Date(endStr);
      googleIds.push(item.id);

      await db
        .insert(externalEvents)
        .values({
          googleEventId: item.id,
          title: item.summary,
          startTime,
          endTime,
          description: item.description ?? null,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: externalEvents.googleEventId,
          set: {
            title: item.summary,
            startTime,
            endTime,
            description: item.description ?? null,
            syncedAt: new Date(),
          },
        });

      result.counts.pulled += 1;
      result.items.push({
        category: 'event',
        action: 'created',
        status: 'success',
        externalEventId: item.id,
        title: item.summary,
        payload: {
          title: item.summary,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          description: item.description ?? null,
        },
      });
    }

    if (googleIds.length > 0) {
      await db
        .delete(externalEvents)
        .where(sql`${externalEvents.googleEventId} NOT IN ${googleIds}`);
    } else {
      await db.delete(externalEvents);
    }

    result.status = computeScopeStatus(result.counts, result.errors);
    await logSync('info', `행사 일정 pull 완료: ${result.counts.pulled}건`);
    return result;
  } catch (error) {
    const message = `행사 일정 pull 실패: ${formatError(error)}`;
    result.counts.failed += 1;
    result.errors.push(message);
    result.status = 'failed';
    await logSync('error', message);
    return result;
  }
}

async function persistSyncRun(
  result: SyncResult,
  triggeredBy: SyncTrigger,
  startedAt: Date
) {
  const now = new Date();

  await db.insert(calendarSyncRuns).values({
    id: result.runId,
    triggeredBy,
    startedAt,
    finishedAt: now,
    status: result.status,
    reservationSyncStatus: result.reservationSyncStatus,
    eventSyncStatus: result.eventSyncStatus,
    reservationCreatedCount: result.counts.reservationCreated,
    reservationUpdatedCount: result.counts.reservationUpdated,
    reservationDeletedCount: result.counts.reservationDeleted,
    eventPulledCount: result.counts.eventPulled,
    failedCount: result.counts.failed,
    errorSummary: summarizeErrors(result.errors),
  });

  if (result.items.length > 0) {
    await db.insert(calendarSyncItems).values(
      result.items.map((item) => ({
        runId: result.runId,
        category: item.category,
        action: item.action,
        status: item.status,
        reservationId: item.reservationId ?? null,
        externalEventId: item.externalEventId ?? null,
        title: item.title,
        payload: item.payload ? JSON.stringify(item.payload) : null,
        errorMessage: item.errorMessage ?? null,
        processedAt: item.processedAt ?? now,
      }))
    );
  }
}

export async function syncAll(
  triggeredBy: SyncTrigger = 'manual'
): Promise<SyncResult> {
  const startedAt = new Date();
  const runId = `sync_${randomUUID()}`;

  const reservationPush = await pushReservationsDetailed();
  const reservationDelete = await syncCancellationsDetailed();
  const eventPull = await pullExternalEventsDetailed();

  const reservationErrors = [
    ...reservationPush.errors,
    ...reservationDelete.errors,
  ];
  const reservationCounts = {
    created: reservationPush.counts.created,
    updated: reservationPush.counts.updated,
    deleted: reservationDelete.counts.deleted,
    pulled: 0,
    failed: reservationPush.counts.failed + reservationDelete.counts.failed,
  };
  const reservationScope: SyncScopeResult = {
    status: computeScopeStatus(reservationCounts, reservationErrors),
    counts: reservationCounts,
    items: [...reservationPush.items, ...reservationDelete.items],
    errors: reservationErrors,
  };

  const result: SyncResult = {
    runId,
    status: computeRunStatus(reservationScope, eventPull),
    reservationSyncStatus: reservationScope.status,
    eventSyncStatus: eventPull.status,
    counts: {
      reservationCreated: reservationScope.counts.created,
      reservationUpdated: reservationScope.counts.updated,
      reservationDeleted: reservationScope.counts.deleted,
      eventPulled: eventPull.counts.pulled,
      failed: reservationScope.counts.failed + eventPull.counts.failed,
    },
    items: [...reservationScope.items, ...eventPull.items],
    errors: [...reservationScope.errors, ...eventPull.errors],
  };

  await persistSyncRun(result, triggeredBy, startedAt);
  return result;
}

export async function listRecentSyncRuns(limit = 20): Promise<CalendarSyncRunSummary[]> {
  const rows = await db
    .select()
    .from(calendarSyncRuns)
    .orderBy(desc(calendarSyncRuns.startedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    status: row.status,
    reservationSyncStatus: row.reservationSyncStatus,
    eventSyncStatus: row.eventSyncStatus,
    counts: {
      reservationCreated: row.reservationCreatedCount,
      reservationUpdated: row.reservationUpdatedCount,
      reservationDeleted: row.reservationDeletedCount,
      eventPulled: row.eventPulledCount,
      failed: row.failedCount,
    },
  }));
}

export async function getSyncRunDetail(
  runId: string
): Promise<CalendarSyncRunDetail | null> {
  const [run] = await db
    .select()
    .from(calendarSyncRuns)
    .where(eq(calendarSyncRuns.id, runId))
    .limit(1);

  if (!run) return null;

  const items = await db
    .select()
    .from(calendarSyncItems)
    .where(eq(calendarSyncItems.runId, runId))
    .orderBy(desc(calendarSyncItems.processedAt));

  return {
    id: run.id,
    triggeredBy: run.triggeredBy,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    status: run.status,
    reservationSyncStatus: run.reservationSyncStatus,
    eventSyncStatus: run.eventSyncStatus,
    counts: {
      reservationCreated: run.reservationCreatedCount,
      reservationUpdated: run.reservationUpdatedCount,
      reservationDeleted: run.reservationDeletedCount,
      eventPulled: run.eventPulledCount,
      failed: run.failedCount,
    },
    items: items.map((item) => ({
      id: item.id,
      category: item.category,
      action: item.action,
      status: item.status === 'partial' ? 'failed' : (item.status as 'success' | 'failed'),
      reservationId: item.reservationId,
      externalEventId: item.externalEventId,
      title: item.title,
      payload: item.payload ? parseHistoryChanges(item.payload) : null,
      errorMessage: item.errorMessage,
      processedAt: item.processedAt.toISOString(),
    })),
  };
}

export async function listCalendars(): Promise<
  { id: string; summary: string }[]
> {
  const calendar = await getCalendarClient();
  if (!calendar) return [];

  try {
    const res = await calendar.calendarList.list();
    return (res.data.items ?? [])
      .filter((c) => c.id && c.summary)
      .map((c) => ({ id: c.id!, summary: c.summary! }));
  } catch {
    return [];
  }
}

export async function saveCalendarIds(
  calendarId: string,
  eventCalendarId: string
): Promise<void> {
  const settings = await getCalendarSettings();
  if (!settings) return;
  await db
    .update(calendarSettings)
    .set({ calendarId, eventCalendarId })
    .where(eq(calendarSettings.id, settings.id));
}
