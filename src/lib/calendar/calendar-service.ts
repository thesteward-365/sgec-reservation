import { getCalendarClient, getCalendarSettings } from './google-client';
import { db } from '@/lib/db';
import { reservations, externalEvents, syncLogs, calendarSettings, reservationHistories } from '@/lib/db';
import { eq, and, gte, sql, isNotNull } from 'drizzle-orm';
import { places, users } from '@/lib/db';

type ReservationEvent = {
  id: number;
  startTime: Date;
  endTime: Date;
  purpose: string;
  placeName: string;
  userName: string;
  googleEventId: string | null;
};

function toRfc3339(date: Date): string {
  return date.toISOString();
}

function buildEventBody(reservation: ReservationEvent, placeName: string, userName: string) {
  return {
    summary: `[예약] ${placeName}`,
    description: `예약자: ${userName}\n목적: ${reservation.purpose}`,
    start: { dateTime: toRfc3339(reservation.startTime), timeZone: 'Asia/Seoul' },
    end: { dateTime: toRfc3339(reservation.endTime), timeZone: 'Asia/Seoul' },
  };
}

async function logSync(level: 'info' | 'error', message: string) {
  await db.insert(syncLogs).values({ level, message });
}

// 단일 예약을 Google Calendar에 생성
export async function createGoogleEvent(reservationId: number): Promise<string | null> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) return null;

  const row = await db
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
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) return null;

  try {
    const event = await calendar.events.insert({
      calendarId: settings.calendarId,
      requestBody: buildEventBody(row, row.placeName, row.userName),
    });

    const eventId = event.data.id!;
    await db
      .update(reservations)
      .set({ googleEventId: eventId })
      .where(eq(reservations.id, reservationId));

    await logSync('info', `예약 #${reservationId} Google 이벤트 생성: ${eventId}`);
    return eventId;
  } catch (e) {
    await logSync('error', `예약 #${reservationId} Google 이벤트 생성 실패: ${String(e)}`);
    return null;
  }
}

// 단일 예약을 Google Calendar에서 업데이트
export async function updateGoogleEvent(reservationId: number): Promise<void> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) return;

  const row = await db
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
    .limit(1)
    .then((rows) => rows[0]);

  if (!row?.googleEventId) {
    // eventId 없으면 새로 생성
    await createGoogleEvent(reservationId);
    return;
  }

  try {
    await calendar.events.update({
      calendarId: settings.calendarId,
      eventId: row.googleEventId,
      requestBody: buildEventBody(row, row.placeName, row.userName),
    });
    await logSync('info', `예약 #${reservationId} Google 이벤트 업데이트: ${row.googleEventId}`);
  } catch (e) {
    await logSync('error', `예약 #${reservationId} Google 이벤트 업데이트 실패: ${String(e)}`);
  }
}

// 단일 예약을 Google Calendar에서 삭제
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
    await logSync('error', `Google 이벤트 삭제 실패 (${googleEventId}): ${String(e)}`);
  }
}

// 행사 일정 캘린더 → local DB pull (external_events upsert)
export async function pullExternalEvents(): Promise<number> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.eventCalendarId) return 0;

  try {
    const now = new Date();
    const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

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

    // 더 이상 Google에 없는 이벤트는 삭제
    const googleIds = items.map((i) => i.id).filter(Boolean) as string[];
    if (googleIds.length > 0) {
      const local = await db.select({ googleEventId: externalEvents.googleEventId }).from(externalEvents);
      for (const { googleEventId } of local) {
        if (!googleIds.includes(googleEventId)) {
          await db.delete(externalEvents).where(eq(externalEvents.googleEventId, googleEventId));
        }
      }
    }

    await logSync('info', `행사 일정 pull 완료: ${count}건`);
    return count;
  } catch (e) {
    await logSync('error', `행사 일정 pull 실패: ${String(e)}`);
    return 0;
  }
}

// DB 예약 → Google push (googleEventId 없는 것 + 미래 예약 보정)
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
    .where(gte(reservations.endTime, sql`(unixepoch())`));

  let count = 0;
  for (const row of pending) {
    try {
      if (row.googleEventId) {
        // 이미 연동된 이벤트 → update
        await calendar.events.update({
          calendarId: settings.calendarId,
          eventId: row.googleEventId,
          requestBody: buildEventBody(row, row.placeName, row.userName),
        });
      } else {
        // 미연동 이벤트 → create + googleEventId 저장
        const event = await calendar.events.insert({
          calendarId: settings.calendarId,
          requestBody: buildEventBody(row, row.placeName, row.userName),
        });
        const eventId = event.data.id!;
        await db.update(reservations).set({ googleEventId: eventId }).where(eq(reservations.id, row.id));
      }
      count++;
    } catch (e) {
      await logSync('error', `push 실패 #${row.id}: ${String(e)}`);
    }
  }

  await logSync('info', `예약 push 완료: ${count}건`);
  return count;
}

// 취소된 예약의 Google 이벤트 삭제 (이력에 googleEventId가 남아있는 것)
export async function syncCancellations(): Promise<number> {
  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();
  if (!calendar || !settings?.calendarId) return 0;

  const pending = await db
    .select({ id: reservationHistories.id, googleEventId: reservationHistories.googleEventId })
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
      // 삭제 완료 후 googleEventId 초기화 (재시도 방지)
      await db
        .update(reservationHistories)
        .set({ googleEventId: null })
        .where(eq(reservationHistories.id, row.id));
      count++;
    } catch (e: unknown) {
      const status = (e as { code?: number }).code;
      if (status === 404 || status === 410) {
        // 이미 Google에 없는 이벤트 → 그냥 초기화
        await db.update(reservationHistories).set({ googleEventId: null }).where(eq(reservationHistories.id, row.id));
        count++;
      } else {
        await logSync('error', `취소 이벤트 삭제 실패 (${row.googleEventId}): ${String(e)}`);
      }
    }
  }

  if (count > 0) await logSync('info', `취소 이벤트 Google 삭제 완료: ${count}건`);
  return count;
}

// 양방향 보정 동기화
export async function syncAll(): Promise<{ pushed: number; pulled: number; deleted: number }> {
  const [pushed, pulled, deleted] = await Promise.all([
    pushReservations(),
    pullExternalEvents(),
    syncCancellations(),
  ]);
  return { pushed, pulled, deleted };
}

// 연결된 계정의 캘린더 목록 조회
export async function listCalendars(): Promise<{ id: string; summary: string }[]> {
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

// 캘린더 ID 저장
export async function saveCalendarIds(calendarId: string, eventCalendarId: string): Promise<void> {
  const settings = await getCalendarSettings();
  if (!settings) return;
  await db.update(calendarSettings).set({ calendarId, eventCalendarId }).where(eq(calendarSettings.id, settings.id));
}
