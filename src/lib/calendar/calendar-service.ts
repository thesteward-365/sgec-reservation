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
import { eq, and, gte, sql, isNotNull, desc, or, notInArray } from 'drizzle-orm';
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

type SyncRunStatus = 'success' | 'partial' | 'failed' | 'skipped';
type SyncCalendarStatus = 'success' | 'failed' | 'skipped';
type SyncTrigger = 'manual' | 'system';
type SyncCategory = 'reservation' | 'event';
type SyncAction = 'created' | 'updated' | 'cancelled';
type ExternalEventRow = {
  googleEventId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  description: string | null;
};

export type SyncItemResult = {
  category: SyncCategory;
  action: SyncAction;
  status: 'success' | 'failed' | 'skipped';
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
    status: 'success' | 'failed' | 'skipped';
    reservationId: number | null;
    externalEventId: string | null;
    title: string;
    payload: Record<string, unknown> | null;
    errorMessage: string | null;
    processedAt: string;
  }>;
  logs: Array<{
    id: number;
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
};

function buildEventBody(reservation: ReservationRow): calendar_v3.Schema$Event {
  return {
    summary: `${reservation.purpose}`,
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

async function logSync(
  level: 'info' | 'error',
  message: string,
  runId?: string
) {
  await db.insert(syncLogs).values({ level, message, runId: runId ?? null });
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

function hasExternalEventChanged(
  existing: ExternalEventRow | undefined,
  next: {
    title: string;
    startTime: Date;
    endTime: Date;
    isAllDay: boolean;
    description: string | null;
  }
) {
  if (!existing) return true;

  return (
    existing.title !== next.title ||
    existing.startTime.toISOString() !== next.startTime.toISOString() ||
    existing.endTime.toISOString() !== next.endTime.toISOString() ||
    existing.isAllDay !== next.isAllDay ||
    (existing.description ?? null) !== (next.description ?? null)
  );
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

async function getLatestSyncItemForReservation(reservationId: number) {
  const [item] = await db
    .select({
      processedAt: calendarSyncItems.processedAt,
      status: calendarSyncItems.status,
      action: calendarSyncItems.action,
    })
    .from(calendarSyncItems)
    .where(
      and(
        eq(calendarSyncItems.reservationId, reservationId),
        eq(calendarSyncItems.category, 'reservation'),
        eq(calendarSyncItems.status, 'success')
      )
    )
    .orderBy(desc(calendarSyncItems.processedAt))
    .limit(1);
  return item;
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

  const parsed = parseHistoryChanges(history?.changes) as Record<
    string,
    unknown
  > | null;
  if (!parsed) return null;

  if (actionType === 'created') {
    const created = parsed.created as
      | { to?: Record<string, unknown> }
      | undefined;
    return (
      created?.to ??
      (parsed.snapshot as Record<string, unknown> | undefined) ??
      parsed
    );
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

export async function syncReservation(
  reservationId: number,
  runId?: string
): Promise<SyncItemResult> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) {
    throw new Error('Google Calendar connection not configured');
  }

  const [row] = await db
    .select({
      id: reservations.id,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      status: reservations.status,
      googleEventId: reservations.googleEventId,
      updatedAt: reservations.updatedAt,
      placeName: places.name,
      userName: users.name,
    })
    .from(reservations)
    .innerJoin(places, eq(reservations.placeId, places.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!row) throw new Error(`Reservation #${reservationId} not found`);

  const title = reservationTitle(row);
  const action: SyncAction =
    row.status === 'cancelled'
      ? 'cancelled'
      : row.googleEventId
        ? 'updated'
        : 'created';

  try {
    let eventId = row.googleEventId;

    if (row.status === 'cancelled') {
      if (row.googleEventId) {
        try {
          await calendar.events.delete({
            calendarId: settings.calendarId,
            eventId: row.googleEventId,
          });
        } catch (error) {
          const status = getErrorStatus(error);
          if (status !== 404 && status !== 410) throw error;
        }
        await db
          .update(reservations)
          .set({ googleEventId: null })
          .where(eq(reservations.id, row.id));
      }
      return {
        category: 'reservation',
        action: 'cancelled',
        status: 'success',
        reservationId: row.id,
        externalEventId: row.googleEventId ?? undefined,
        title,
      };
    }

    // Active reservation
    if (row.googleEventId) {
      try {
        await calendar.events.update({
          calendarId: settings.calendarId,
          eventId: row.googleEventId,
          requestBody: buildEventBody(row as ReservationRow),
        });
      } catch (error) {
        const status = getErrorStatus(error);
        if (status === 404 || status === 410) {
          const recreated = await calendar.events.insert({
            calendarId: settings.calendarId,
            requestBody: buildEventBody(row as ReservationRow),
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
    } else {
      const event = await calendar.events.insert({
        calendarId: settings.calendarId,
        requestBody: buildEventBody(row as ReservationRow),
      });
      eventId = event.data.id!;
      await db
        .update(reservations)
        .set({ googleEventId: eventId })
        .where(eq(reservations.id, row.id));
    }

    const payload =
      (await getLatestReservationHistoryPayload(
        row.id,
        action === 'updated' ? 'updated' : 'created'
      )) ?? buildReservationPayload(row as ReservationRow);

    return {
      category: 'reservation',
      action,
      status: 'success',
      reservationId: row.id,
      externalEventId: eventId ?? undefined,
      title,
      payload,
    };
  } catch (error) {
    const message = `예약 #${row.id} 동기화 실패: ${formatError(error)}`;
    await logSync('error', message, runId);
    return {
      category: 'reservation',
      action,
      status: 'failed',
      reservationId: row.id,
      externalEventId: row.googleEventId ?? undefined,
      title,
      errorMessage: message,
    };
  }
}

async function pushReservationsDetailed(
  runId: string
): Promise<SyncScopeResult> {
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

  // 대상 선정: 종료되지 않은 모든 활성 예약 + Google ID가 남아있는 취소 예약
  const candidateRows = await db
    .select({
      id: reservations.id,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      status: reservations.status,
      googleEventId: reservations.googleEventId,
      updatedAt: reservations.updatedAt,
      placeName: places.name,
      userName: users.name,
    })
    .from(reservations)
    .innerJoin(places, eq(reservations.placeId, places.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(
      or(
        and(
          eq(reservations.status, 'active'),
          gte(reservations.endTime, sql`now()`)
        ),
        and(
          eq(reservations.status, 'cancelled'),
          isNotNull(reservations.googleEventId)
        )
      )
    );

  const result: SyncScopeResult = {
    status: 'skipped',
    counts: { created: 0, updated: 0, deleted: 0, pulled: 0, failed: 0 },
    items: [],
    errors: [],
  };

  for (const row of candidateRows) {
    const title = reservationTitle(row);
    const lastSync = await getLatestSyncItemForReservation(row.id);

    // 1. 활성 예약 처리
    if (row.status === 'active') {
      const action: SyncAction = row.googleEventId ? 'updated' : 'created';

      // 변경 사항 여부 확인 (Google ID가 없거나, updatedAt이 마지막 동기화보다 뒤인 경우)
      const isOutdated =
        !row.googleEventId ||
        !lastSync ||
        row.updatedAt.getTime() > lastSync.processedAt.getTime();

      if (!isOutdated) {
        result.items.push({
          category: 'reservation',
          action,
          status: 'skipped',
          reservationId: row.id,
          externalEventId: row.googleEventId ?? undefined,
          title,
        });
        continue;
      }

      try {
        let eventId = row.googleEventId;
        if (row.googleEventId) {
          try {
            await calendar.events.update({
              calendarId: settings.calendarId,
              eventId: row.googleEventId,
              requestBody: buildEventBody(row as ReservationRow),
            });
            result.counts.updated += 1;
          } catch (error) {
            const status = getErrorStatus(error);
            if (status === 404 || status === 410) {
              const recreated = await calendar.events.insert({
                calendarId: settings.calendarId,
                requestBody: buildEventBody(row as ReservationRow),
              });
              eventId = recreated.data.id!;
              await db
                .update(reservations)
                .set({ googleEventId: eventId })
                .where(eq(reservations.id, row.id));
              result.counts.created += 1;
            } else {
              throw error;
            }
          }
        } else {
          const event = await calendar.events.insert({
            calendarId: settings.calendarId,
            requestBody: buildEventBody(row as ReservationRow),
          });
          eventId = event.data.id!;
          await db
            .update(reservations)
            .set({ googleEventId: eventId })
            .where(eq(reservations.id, row.id));
          result.counts.created += 1;
        }

        result.items.push({
          category: 'reservation',
          action,
          status: 'success',
          reservationId: row.id,
          externalEventId: eventId ?? undefined,
          title,
          payload:
            (await getLatestReservationHistoryPayload(
              row.id,
              action === 'updated' ? 'updated' : 'created'
            )) ?? buildReservationPayload(row as ReservationRow),
        });
      } catch (error) {
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
          payload: buildReservationPayload(row as ReservationRow),
          errorMessage: message,
        });
        await logSync('error', message, runId);
      }
    }
    // 2. 취소된 예약 처리
    else if (row.status === 'cancelled' && row.googleEventId) {
      try {
        await calendar.events.delete({
          calendarId: settings.calendarId,
          eventId: row.googleEventId,
        });
        await db
          .update(reservations)
          .set({ googleEventId: null })
          .where(eq(reservations.id, row.id));

        result.counts.deleted += 1;
        result.items.push({
          category: 'reservation',
          action: 'cancelled',
          status: 'success',
          reservationId: row.id,
          externalEventId: row.googleEventId,
          title,
        });
      } catch (error) {
        const status = getErrorStatus(error);
        if (status === 404 || status === 410) {
          await db
            .update(reservations)
            .set({ googleEventId: null })
            .where(eq(reservations.id, row.id));
          result.counts.deleted += 1;
          result.items.push({
            category: 'reservation',
            action: 'cancelled',
            status: 'success',
            reservationId: row.id,
            externalEventId: row.googleEventId,
            title,
          });
        } else {
          const message = `예약 #${row.id} 취소 이벤트 삭제 실패: ${formatError(error)}`;
          result.counts.failed += 1;
          result.errors.push(message);
          result.items.push({
            category: 'reservation',
            action: 'cancelled',
            status: 'failed',
            reservationId: row.id,
            externalEventId: row.googleEventId,
            title,
            errorMessage: message,
          });
          await logSync('error', message, runId);
        }
      }
    }
  }

  result.status = computeScopeStatus(result.counts, result.errors);
  await logSync(
    'info',
    `예약 동기화 완료: 생성 ${result.counts.created}건, 수정 ${result.counts.updated}건, 삭제 ${result.counts.deleted}건, 건너뜀 ${result.items.filter((i) => i.status === 'skipped').length}건, 실패 ${result.counts.failed}건`,
    runId
  );
  return result;
}

async function pullExternalEventsDetailed(
  runId: string
): Promise<SyncScopeResult> {
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
    const threeMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 3,
      now.getDate(),
      0,
      0,
      0
    );
    const oneYearLater = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate()
    );

    const allItems: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    const existingEvents = await db
      .select({
        googleEventId: externalEvents.googleEventId,
        title: externalEvents.title,
        startTime: externalEvents.startTime,
        endTime: externalEvents.endTime,
        isAllDay: externalEvents.isAllDay,
        description: externalEvents.description,
      })
      .from(externalEvents);
    const existingEventsById = new Map(
      existingEvents.map((event) => [event.googleEventId, event])
    );

    do {
      const res = await calendar.events.list({
        calendarId: settings.eventCalendarId,
        timeMin: threeMonthsAgo.toISOString(),
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

      const isAllDay = !!(item.start?.date && item.end?.date);
      const startStr = item.start?.dateTime ?? item.start?.date;
      const endStr = item.end?.dateTime ?? item.end?.date;
      if (!startStr || !endStr) continue;

      // 종일 일정인 경우 KST 00:00:00으로 강제 보정
      const startTime = isAllDay
        ? new Date(`${item.start!.date}T00:00:00+09:00`)
        : new Date(startStr);
      const endTime = isAllDay
        ? new Date(`${item.end!.date}T00:00:00+09:00`)
        : new Date(endStr);

      googleIds.push(item.id);
      const nextEvent = {
        title: item.summary,
        startTime,
        endTime,
        isAllDay,
        description: item.description ?? null,
      };
      const existingEvent = existingEventsById.get(item.id);
      const hasChanged = hasExternalEventChanged(existingEvent, nextEvent);
      const action: SyncAction = existingEvent ? 'updated' : 'created';

      if (hasChanged) {
        await db
          .insert(externalEvents)
          .values({
            googleEventId: item.id,
            ...nextEvent,
            syncedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: externalEvents.googleEventId,
            set: {
              ...nextEvent,
              syncedAt: new Date(),
            },
          });

        result.counts.pulled += 1;
        result.items.push({
          category: 'event',
          action,
          status: 'success',
          externalEventId: item.id,
          title: item.summary,
          payload: {
            title: item.summary,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            isAllDay,
            description: item.description ?? null,
          },
        });
      } else {
        result.items.push({
          category: 'event',
          action,
          status: 'skipped',
          externalEventId: item.id,
          title: item.summary,
        });
      }
    }

    const deleteWhere =
      googleIds.length > 0
        ? and(
            notInArray(externalEvents.googleEventId, googleIds),
            gte(externalEvents.startTime, threeMonthsAgo)
          )
        : gte(externalEvents.startTime, threeMonthsAgo);

    const deletedEvents = await db
      .select({
        googleEventId: externalEvents.googleEventId,
        title: externalEvents.title,
        startTime: externalEvents.startTime,
        endTime: externalEvents.endTime,
        isAllDay: externalEvents.isAllDay,
        description: externalEvents.description,
      })
      .from(externalEvents)
      .where(deleteWhere);

    if (deletedEvents.length > 0) {
      await db.delete(externalEvents).where(deleteWhere);

      result.counts.deleted += deletedEvents.length;
      for (const event of deletedEvents) {
        result.items.push({
          category: 'event',
          action: 'cancelled',
          status: 'success',
          externalEventId: event.googleEventId,
          title: event.title,
          payload: {
            title: event.title,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            isAllDay: event.isAllDay,
            description: event.description ?? null,
          },
        });
      }
    }

    result.status = computeScopeStatus(result.counts, result.errors);
    await logSync(
      'info',
      `행사 일정 pull 완료: 가져옴 ${result.counts.pulled}건, 삭제 ${result.counts.deleted}건, 건너뜀 ${result.items.filter((i) => i.category === 'event' && i.status === 'skipped').length}건`,
      runId
    );
    return result;
  } catch (error) {
    const message = `행사 일정 pull 실패: ${formatError(error)}`;
    result.counts.failed += 1;
    result.errors.push(message);
    result.status = 'failed';
    await logSync('error', message, runId);
    return result;
  }
}

async function createSyncRun(
  runId: string,
  triggeredBy: SyncTrigger,
  startedAt: Date
) {
  await db.insert(calendarSyncRuns).values({
    id: runId,
    triggeredBy,
    startedAt,
    status: 'success',
    reservationSyncStatus: 'skipped',
    eventSyncStatus: 'skipped',
  });
}

async function finalizeSyncRun(result: SyncResult) {
  const now = new Date();

  await db
    .update(calendarSyncRuns)
    .set({
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
    })
    .where(eq(calendarSyncRuns.id, result.runId));

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

  await createSyncRun(runId, triggeredBy, startedAt);

  const reservationSync = await pushReservationsDetailed(runId);
  const eventPull = await pullExternalEventsDetailed(runId);

  const result: SyncResult = {
    runId,
    status: computeRunStatus(reservationSync, eventPull),
    reservationSyncStatus: reservationSync.status,
    eventSyncStatus: eventPull.status,
    counts: {
      reservationCreated: reservationSync.counts.created,
      reservationUpdated: reservationSync.counts.updated,
      reservationDeleted: reservationSync.counts.deleted,
      eventPulled: eventPull.counts.pulled,
      failed: reservationSync.counts.failed + eventPull.counts.failed,
    },
    items: [...reservationSync.items, ...eventPull.items],
    errors: [...reservationSync.errors, ...eventPull.errors],
  };

  await finalizeSyncRun(result);
  return result;
}

export async function listRecentSyncRuns(
  limit = 20
): Promise<CalendarSyncRunSummary[]> {
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
  const logs = await db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.runId, runId))
    .orderBy(desc(syncLogs.timestamp));

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
      category: item.category as SyncCategory,
      action: item.action as SyncAction,
      status: (item.status === 'partial' ? 'failed' : item.status) as
        | 'success'
        | 'failed'
        | 'skipped',
      reservationId: item.reservationId,
      externalEventId: item.externalEventId,
      title: item.title,
      payload: item.payload
        ? (parseHistoryChanges(item.payload) as Record<string, unknown>)
        : null,
      errorMessage: item.errorMessage,
      processedAt: item.processedAt.toISOString(),
    })),
    logs: logs.map((log) => ({
      id: log.id,
      level: log.level as 'info' | 'warning' | 'error',
      message: log.message,
      timestamp: log.timestamp.toISOString(),
    })),
  };
}

export async function listCalendars(): Promise<
  { id: string; summary: string }[]
> {
  const calendar = await getCalendarClient();
  if (!calendar) {
    console.warn('listCalendars: Google Calendar client not initialized');
    return [];
  }

  try {
    const res = await calendar.calendarList.list();
    return (res.data.items ?? [])
      .filter((c: calendar_v3.Schema$CalendarListEntry) => c.id && c.summary)
      .map((c: calendar_v3.Schema$CalendarListEntry) => ({
        id: c.id!,
        summary: c.summary!,
      }));
  } catch (error) {
    console.error('listCalendars: Failed to fetch calendar list:', error);
    return [];
  }
}

export async function getGoogleEventUrl(
  googleEventId: string | null | undefined
): Promise<string | null> {
  if (!googleEventId) return null;

  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) return null;

  try {
    const event: { data: calendar_v3.Schema$Event } = await calendar.events.get(
      {
        calendarId: settings.calendarId,
        eventId: googleEventId,
      }
    );

    return event.data.htmlLink ?? null;
  } catch {
    return null;
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
