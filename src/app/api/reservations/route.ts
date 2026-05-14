import { NextRequest, NextResponse } from 'next/server';
import { db, reservations, users, toDbDate, fromDbDate } from '@/lib/db';
import { eq, and, asc, gt, lt } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { isHalfHourRange } from '@/lib/services/reservation-slots';
import { ReservationService } from '@/lib/services/reservation-service';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const placeId = searchParams.get('placeId');
  const date = searchParams.get('date'); // YYYY-MM-DD

  if (!placeId || !date) {
    return NextResponse.json({ error: 'placeId and date are required' }, { status: 400 });
  }

  const [y, mo, d] = date.split('-').map(Number);
  // Create dates in a way that always represents the full day in KST (UTC+9)
  // dayStart: YYYY-MM-DD 00:00:00 KST = YYYY-MM-DD-1 15:00:00 UTC
  // dayEnd: YYYY-MM-DD 23:59:59 KST = YYYY-MM-DD 14:59:59 UTC
  const dayStart = new Date(Date.UTC(y, mo - 1, d - 1, 15, 0, 0));
  const dayEnd = new Date(Date.UTC(y, mo - 1, d, 15, 0, 0));

  const rows = await db
    .select({
      id: reservations.id,
      userId: reservations.userId,
      userName: users.name,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      status: reservations.status,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .where(
      and(
        eq(reservations.placeId, parseInt(placeId)),
        lt(reservations.startTime, toDbDate(dayEnd) as any),
        gt(reservations.endTime, toDbDate(dayStart) as any),
        eq(reservations.status, 'active')
      )
    )
    .orderBy(asc(reservations.startTime));

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      startTime: fromDbDate(r.startTime).toISOString(),
      endTime: fromDbDate(r.endTime).toISOString(),
    }))
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[API] Create Reservation Request:', body);
    const { placeId, startTime, endTime, purpose } = body;

    if (!placeId || !startTime || !endTime || !purpose?.trim()) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: '유효하지 않은 시간입니다.' }, { status: 400 });
    }

    if (!isHalfHourRange(start, end)) {
      return NextResponse.json({ error: '예약은 30분 단위로만 가능합니다.' }, { status: 400 });
    }

    const created = await ReservationService.createReservation(session.user, {
      placeId: Number(placeId),
      startTime: start,
      endTime: end,
      purpose: purpose.trim(),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /api/reservations error:', error);
    const status = error.message.includes('이미 예약이 있습니다') ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
