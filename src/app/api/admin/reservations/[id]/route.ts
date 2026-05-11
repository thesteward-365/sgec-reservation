import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  reservations,
  reservationHistories,
  places,
  users,
  calendarSyncItems,
} from '@/lib/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { ReservationService } from '@/lib/services/reservation-service';
import { getGoogleEventUrl } from '@/lib/calendar/calendar-service';

type Params = { params: Promise<{ id: string }> };
type GoogleSyncStatus = 'synced' | 'pending' | 'missing_event';

async function getReservationGoogleSync(
  reservationId: number,
  googleEventId: string | null
): Promise<{
  status: GoogleSyncStatus;
  label: string;
  lastSyncedAt: string | null;
  runId: string | null;
}> {
  if (!googleEventId) {
    return {
      status: 'missing_event',
      label: 'Google 이벤트 없음',
      lastSyncedAt: null,
      runId: null,
    };
  }

  const [latestChangeRows, latestSyncItemRows] = await Promise.all([
    db
      .select({
        createdAt: reservationHistories.createdAt,
      })
      .from(reservationHistories)
      .where(
        and(
          eq(reservationHistories.reservationId, reservationId),
          or(
            eq(reservationHistories.actionType, 'created'),
            eq(reservationHistories.actionType, 'updated')
          )
        )
      )
      .orderBy(desc(reservationHistories.createdAt))
      .limit(1),
    db
      .select({
        processedAt: calendarSyncItems.processedAt,
        externalEventId: calendarSyncItems.externalEventId,
        runId: calendarSyncItems.runId,
      })
      .from(calendarSyncItems)
      .where(
        and(
          eq(calendarSyncItems.reservationId, reservationId),
          eq(calendarSyncItems.category, 'reservation'),
          eq(calendarSyncItems.status, 'success'),
          or(
            eq(calendarSyncItems.action, 'created'),
            eq(calendarSyncItems.action, 'updated')
          )
        )
      )
      .orderBy(desc(calendarSyncItems.processedAt))
      .limit(1),
  ]);
  const latestChange = latestChangeRows[0];
  const latestSyncItem = latestSyncItemRows[0];

  const changeAt = latestChange?.createdAt ?? null;
  const syncedAt = latestSyncItem?.processedAt ?? null;
  const isOutdated =
    !syncedAt ||
    !!(changeAt && syncedAt.getTime() < changeAt.getTime()) ||
    latestSyncItem?.externalEventId !== googleEventId;

  if (isOutdated) {
    return {
      status: 'pending',
      label: '동기화 필요',
      lastSyncedAt: syncedAt ? syncedAt.toISOString() : null,
      runId: latestSyncItem?.runId ?? null,
    };
  }

  return {
    status: 'synced',
    label: '동기화됨',
    lastSyncedAt: syncedAt.toISOString(),
    runId: latestSyncItem.runId,
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const reservationId = parseInt(id);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const [reservation] = await db
      .select({
        id: reservations.id,
        placeId: reservations.placeId,
        placeName: places.name,
        userName: users.name,
        purpose: reservations.purpose,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        status: reservations.status,
        googleEventId: reservations.googleEventId,
      })
      .from(reservations)
      .leftJoin(places, eq(reservations.placeId, places.id))
      .leftJoin(users, eq(reservations.userId, users.id))
      .where(eq(reservations.id, reservationId));

    if (reservation) {
      const googleSync =
        reservation.status === 'cancelled'
          ? null
          : await getReservationGoogleSync(
              reservationId,
              reservation.googleEventId
            );

      return NextResponse.json({
        ...reservation,
        googleEventUrl:
          reservation.status === 'cancelled'
            ? null
            : await getGoogleEventUrl(reservation.googleEventId),
        googleSync,
        isCancelled: reservation.status === 'cancelled',
      });
    }

    // Fallback for old deleted data (if any)
    const [cancelledHistory] = await db
      .select()
      .from(reservationHistories)
      .where(
        and(
          eq(reservationHistories.reservationId, reservationId),
          eq(reservationHistories.actionType, 'cancelled')
        )
      )
      .orderBy(desc(reservationHistories.createdAt))
      .limit(1);

    if (cancelledHistory) {
      const changes = JSON.parse(cancelledHistory.changes);
      const snapshot = changes.snapshot;
      
      if (snapshot) {
        return NextResponse.json({
          id: reservationId,
          placeId: snapshot.placeId,
          placeName: snapshot.placeName || '삭제된 장소',
          userName: snapshot.userName || '-',
          purpose: snapshot.purpose || '-',
          startTime: snapshot.startTime,
          endTime: snapshot.endTime,
          googleEventUrl: null,
          googleSync: null,
          isCancelled: true,
        });
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Fetch reservation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const reservationId = parseInt(id);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await ReservationService.cancelReservation(reservationId, session.user);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/admin/reservations/[id] error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('찾을 수 없거나') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
