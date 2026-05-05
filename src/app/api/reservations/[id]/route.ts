import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, reservationHistories, reservations } from '@/lib/db/schema';
import { eq, and, gt, lt, ne } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { isHalfHourRange } from '@/lib/services/reservation-slots';
import {
  buildReservationHistoryChanges,
  hasReservationHistoryChanges,
} from '@/lib/services/reservation-history';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const user = session.user;

  const { id } = await params;
  const reservationId = parseInt(id);
  if (isNaN(reservationId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const deleted = db.transaction((tx) => {
    const removed = tx
      .delete(reservations)
      .where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.userId, user.id)
        )
      )
      .returning()
      .all();

    if (removed.length === 0) return removed;

    tx
      .insert(reservationHistories)
      .values({
        reservationId,
        actorUserId: user.id,
        actorUserName: user.name,
        actionType: 'cancelled',
        changes: JSON.stringify({
          cancelled: {
            from: 'active',
            to: 'cancelled',
          },
        }),
      })
      .run();

    return removed;
  });

  if (deleted.length === 0) {
    return NextResponse.json({ error: '예약을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const user = session.user;

  const { id } = await params;
  const reservationId = parseInt(id);
  if (isNaN(reservationId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { placeId, startTime, endTime, purpose } = await request.json();
  const start = new Date(startTime);
  const end = new Date(endTime);
  const trimmedPurpose = purpose?.trim();
  const nextPlaceId = Number(placeId);

  if (!trimmedPurpose) {
    return NextResponse.json({ error: '사용 목적을 입력해 주세요.' }, { status: 400 });
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: '유효하지 않은 시간입니다.' }, { status: 400 });
  }

  if (!Number.isInteger(nextPlaceId) || nextPlaceId <= 0) {
    return NextResponse.json({ error: '유효하지 않은 장소입니다.' }, { status: 400 });
  }

  if (!isHalfHourRange(start, end)) {
    return NextResponse.json({ error: '예약은 30분 단위로만 가능합니다.' }, { status: 400 });
  }

  const isAdmin = user.role === 'admin';

  const [currentReservation] = await db
    .select({
      id: reservations.id,
      placeId: reservations.placeId,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
    })
    .from(reservations)
    .where(
      isAdmin
        ? eq(reservations.id, reservationId)
        : and(eq(reservations.id, reservationId), eq(reservations.userId, user.id))
    );

  if (!currentReservation) {
    return NextResponse.json({ error: '예약을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
  }

  if (currentReservation.endTime < new Date()) {
    return NextResponse.json({ error: '지난 예약은 수정할 수 없습니다.' }, { status: 400 });
  }

  const [targetPlace] = await db
    .select({ id: places.id })
    .from(places)
    .where(eq(places.id, nextPlaceId));

  if (!targetPlace) {
    return NextResponse.json({ error: '선택한 장소를 찾을 수 없습니다.' }, { status: 404 });
  }

  const conflicts = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.placeId, nextPlaceId),
        ne(reservations.id, reservationId),
        lt(reservations.startTime, end),
        gt(reservations.endTime, start)
      )
    );

  if (conflicts.length > 0) {
    return NextResponse.json({ error: '해당 시간에 이미 예약이 있습니다.' }, { status: 409 });
  }

  const changes = buildReservationHistoryChanges(
    {
      placeId: currentReservation.placeId,
      startTime: currentReservation.startTime,
      endTime: currentReservation.endTime,
      purpose: currentReservation.purpose,
    },
    {
      placeId: nextPlaceId,
      startTime: start,
      endTime: end,
      purpose: trimmedPurpose,
    }
  );

  if (!hasReservationHistoryChanges(changes)) {
    return NextResponse.json(currentReservation);
  }

  const [updated] = db.transaction((tx) => {
    const [nextReservation] = tx
      .update(reservations)
      .set({
        placeId: nextPlaceId,
        startTime: start,
        endTime: end,
        purpose: trimmedPurpose,
      })
      .where(
        isAdmin
          ? eq(reservations.id, reservationId)
          : and(eq(reservations.id, reservationId), eq(reservations.userId, user.id))
      )
      .returning()
      .all();

    tx
      .insert(reservationHistories)
      .values({
        reservationId,
        actorUserId: user.id,
        actorUserName: user.name,
        actionType: 'updated',
        changes: JSON.stringify(changes),
      })
      .run();

    return [nextReservation];
  });

  return NextResponse.json(updated);
}
