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
import {
  getGoogleEventUrl,
  type CalendarSyncErrorCode,
} from '@/lib/calendar/calendar-service';

type Params = { params: Promise<{ id: string }> };
type GoogleSyncStatus = 'synced' | 'pending' | 'failed';

type SyncErrorPayload = {
  code: CalendarSyncErrorCode;
  label: string;
  message: string;
  detail: string;
  retryable: boolean;
};

function parseSyncErrorPayload(payload: string | null): SyncErrorPayload | null {
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as { syncError?: unknown };
    const syncError = parsed.syncError;
    if (!syncError || typeof syncError !== 'object') return null;

    const candidate = syncError as Partial<SyncErrorPayload>;
    if (!candidate.code || !candidate.message) return null;

    return {
      code: candidate.code,
      label: candidate.label ?? '동기화 오류',
      message: candidate.message,
      detail: candidate.detail ?? '',
      retryable: candidate.retryable ?? true,
    };
  } catch {
    return null;
  }
}

async function getReservationGoogleSync(
  reservationId: number,
  googleEventId: string | null,
  updatedAt: Date
): Promise<{
  status: GoogleSyncStatus;
  label: string;
  lastSyncedAt: string | null;
  lastAttemptedAt: string | null;
  runId: string | null;
  errorCode: CalendarSyncErrorCode | null;
  errorLabel: string | null;
  errorMessage: string | null;
  retryable: boolean;
}> {
  const syncItemRows = await db
    .select({
      processedAt: calendarSyncItems.processedAt,
      externalEventId: calendarSyncItems.externalEventId,
      runId: calendarSyncItems.runId,
      status: calendarSyncItems.status,
      errorMessage: calendarSyncItems.errorMessage,
      payload: calendarSyncItems.payload,
    })
    .from(calendarSyncItems)
    .where(
      and(
        eq(calendarSyncItems.reservationId, reservationId),
        eq(calendarSyncItems.category, 'reservation'),
        or(
          eq(calendarSyncItems.action, 'created'),
          eq(calendarSyncItems.action, 'updated')
        )
      )
    )
    .orderBy(desc(calendarSyncItems.processedAt))
    .limit(5);
  const latestAttempt = syncItemRows[0];
  const latestSuccessItem = syncItemRows.find(
    (item) => item.status === 'success'
  );

  if (latestAttempt?.status === 'failed') {
    const syncError = parseSyncErrorPayload(latestAttempt.payload);
    return {
      status: 'failed',
      label: '동기화 실패',
      lastSyncedAt: latestSuccessItem?.processedAt
        ? latestSuccessItem.processedAt.toISOString()
        : null,
      lastAttemptedAt: latestAttempt.processedAt.toISOString(),
      runId: latestAttempt.runId,
      errorCode: syncError?.code ?? 'unknown',
      errorLabel: syncError?.label ?? '알 수 없는 오류',
      errorMessage: syncError?.message ?? latestAttempt.errorMessage,
      retryable: syncError?.retryable ?? true,
    };
  }

  if (!googleEventId) {
    return {
      status: 'pending',
      label: '동기화 필요 (이벤트 없음)',
      lastSyncedAt: latestSuccessItem?.processedAt
        ? latestSuccessItem.processedAt.toISOString()
        : null,
      lastAttemptedAt: latestAttempt?.processedAt
        ? latestAttempt.processedAt.toISOString()
        : null,
      runId: null,
      errorCode: null,
      errorLabel: null,
      errorMessage: null,
      retryable: true,
    };
  }

  const syncedAt = latestSuccessItem?.processedAt ?? null;
  const isOutdated =
    !syncedAt ||
    updatedAt.getTime() > syncedAt.getTime() ||
    latestSuccessItem?.externalEventId !== googleEventId;

  if (isOutdated) {
    return {
      status: 'pending',
      label: '동기화 필요',
      lastSyncedAt: syncedAt ? syncedAt.toISOString() : null,
      lastAttemptedAt: latestAttempt?.processedAt
        ? latestAttempt.processedAt.toISOString()
        : null,
      runId: latestAttempt?.runId ?? null,
      errorCode: null,
      errorLabel: null,
      errorMessage: null,
      retryable: true,
    };
  }

  return {
    status: 'synced',
    label: '동기화됨',
    lastSyncedAt: syncedAt.toISOString(),
    lastAttemptedAt: latestAttempt?.processedAt
      ? latestAttempt.processedAt.toISOString()
      : syncedAt.toISOString(),
    runId: latestSuccessItem.runId,
    errorCode: null,
    errorLabel: null,
    errorMessage: null,
    retryable: true,
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
        updatedAt: reservations.updatedAt,
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
              reservation.googleEventId,
              reservation.updatedAt
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
