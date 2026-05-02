import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { eq, and, gt, lt, ne } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { isHalfHourRange } from '@/lib/services/reservation-slots';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id } = await params;
  const reservationId = parseInt(id);
  if (isNaN(reservationId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const deleted = await db
    .delete(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.userId, session.user.id)
      )
    )
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: '예약을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id } = await params;
  const reservationId = parseInt(id);
  if (isNaN(reservationId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { startTime, endTime, purpose } = await request.json();
  const start = new Date(startTime);
  const end = new Date(endTime);
  const trimmedPurpose = purpose?.trim();

  if (!trimmedPurpose) {
    return NextResponse.json({ error: '사용 목적을 입력해 주세요.' }, { status: 400 });
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: '유효하지 않은 시간입니다.' }, { status: 400 });
  }

  if (!isHalfHourRange(start, end)) {
    return NextResponse.json({ error: '예약은 30분 단위로만 가능합니다.' }, { status: 400 });
  }

  const [currentReservation] = await db
    .select({
      id: reservations.id,
      placeId: reservations.placeId,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.userId, session.user.id)
      )
    );

  if (!currentReservation) {
    return NextResponse.json({ error: '예약을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
  }

  const conflicts = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.placeId, currentReservation.placeId),
        ne(reservations.id, reservationId),
        lt(reservations.startTime, end),
        gt(reservations.endTime, start)
      )
    );

  if (conflicts.length > 0) {
    return NextResponse.json({ error: '해당 시간에 이미 예약이 있습니다.' }, { status: 409 });
  }

  const [updated] = await db
    .update(reservations)
    .set({ startTime: start, endTime: end, purpose: trimmedPurpose })
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.userId, session.user.id)
      )
    )
    .returning();

  return NextResponse.json(updated);
}
