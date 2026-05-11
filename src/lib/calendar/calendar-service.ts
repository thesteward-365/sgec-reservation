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
} from '@/lib/db';
import { eq, and, gte, sql, isNotNull } from 'drizzle-orm';
import { calendar_v3 } from 'googleapis';

/**
 * PostgreSQL timestamp 컬럼을 그대로 사용하는 예약 행 타입입니다.
 */
type ReservationRow = {
  id: number;
  startTime: Date;
  endTime: Date;
  purpose: string;
  placeName: string;
  userName: string;
  googleEventId: string | null;
};

/**
 * DB의 Date 객체를 기반으로 Google Event Body 생성
 */
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
  // 스키마의 defaultNow()가 적용되므로 timestamp는 생략 가능합니다.
  await db.insert(syncLogs).values({ level, message });
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

export async function pullExternalEvents(): Promise<number> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.eventCalendarId) return 0;

  try {
    const now = new Date();
    const oneYearLater = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate()
    );

    const res = await calendar.events.list({
      calendarId: settings.eventCalendarId,
      timeMin: now.toISOString(),
      timeMax: oneYearLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const items = res.data.items ?? [];
    let count = 0;

    for (const item of items) {
      if (!item.id || !item.summary) continue;

      const startStr = item.start?.dateTime ?? item.start?.date;
      const endStr = item.end?.dateTime ?? item.end?.date;
      if (!startStr || !endStr) continue;

      // 이제 DB에 직접 Date 객체를 전달할 수 있습니다.
      const startTime = new Date(startStr);
      const endTime = new Date(endStr);

      await db
        .insert(externalEvents)
        .values({
          googleEventId: item.id,
          title: item.summary,
          startTime,
          endTime,
          description: item.description ?? null,
          syncedAt: new Date(), // 현재 시간
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

      count++;
    }

    const googleIds = items.map((i) => i.id).filter(Boolean) as string[];
    if (googleIds.length > 0) {
      await db
        .delete(externalEvents)
        .where(sql`${externalEvents.googleEventId} NOT IN ${googleIds}`);
    }

    await logSync('info', `행사 일정 pull 완료: ${count}건`);
    return count;
  } catch (e) {
    await logSync('error', `행사 일정 pull 실패: ${String(e)}`);
    return 0;
  }
}

export async function pushReservations(): Promise<number> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) return 0;

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

  let count = 0;
  for (const row of pending) {
    try {
      if (row.googleEventId) {
        await calendar.events.update({
          calendarId: settings.calendarId,
          eventId: row.googleEventId,
          requestBody: buildEventBody(row),
        });
      } else {
        const event = await calendar.events.insert({
          calendarId: settings.calendarId,
          requestBody: buildEventBody(row),
        });
        const eventId = event.data.id!;
        await db
          .update(reservations)
          .set({ googleEventId: eventId })
          .where(eq(reservations.id, row.id));
      }
      count++;
    } catch (e) {
      await logSync('error', `push 실패 #${row.id}: ${String(e)}`);
    }
  }

  await logSync('info', `예약 push 완료: ${count}건`);
  return count;
}

export async function syncCancellations(): Promise<number> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) return 0;

  const pending = await db
    .select({
      id: reservationHistories.id,
      googleEventId: reservationHistories.googleEventId,
    })
    .from(reservationHistories)
    .where(
      and(
        eq(reservationHistories.actionType, 'cancelled'),
        isNotNull(reservationHistories.googleEventId)
      )
    );

  let count = 0;
  for (const row of pending) {
    try {
      await calendar.events.delete({
        calendarId: settings.calendarId,
        eventId: row.googleEventId!,
      });

      await db
        .update(reservationHistories)
        .set({ googleEventId: null })
        .where(eq(reservationHistories.id, row.id));
      count++;
    } catch (e: any) {
      const status = e.code;
      if (status === 404 || status === 410) {
        await db
          .update(reservationHistories)
          .set({ googleEventId: null })
          .where(eq(reservationHistories.id, row.id));
        count++;
      } else {
        await logSync(
          'error',
          `취소 이벤트 삭제 실패 (${row.googleEventId}): ${String(e)}`
        );
      }
    }
  }

  if (count > 0)
    await logSync('info', `취소 이벤트 Google 삭제 완료: ${count}건`);
  return count;
}
// syncAll, listCalendars, saveCalendarIds 함수 등은 이전과 동일하게 유지...

export async function syncAll(): Promise<{
  pushed: number;
  pulled: number;
  deleted: number;
}> {
  const [pushed, pulled, deleted] = await Promise.all([
    pushReservations(),
    pullExternalEvents(),
    syncCancellations(),
  ]);
  return { pushed, pulled, deleted };
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
