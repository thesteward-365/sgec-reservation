import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reservationHistories, reservations, users } from '@/lib/db/schema';
import { eq, and, asc, gt, lt } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { isHalfHourRange } from '@/lib/services/reservation-slots';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const placeId = searchParams.get('placeId');
  const date = searchParams.get('date'); // YYYY-MM-DD

  if (!placeId || !date) {
    return NextResponse.json({ error: 'placeId and date are required' }, { status: 400 });
  }

  const [y, mo, d] = date.split('-').map(Number);
  const dayStart = new Date(y, mo - 1, d, 0, 0, 0);
  const dayEnd = new Date(y, mo - 1, d + 1, 0, 0, 0);

  const rows = await db
    .select({
      id: reservations.id,
      userId: reservations.userId,
      userName: users.name,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .where(
      and(
        eq(reservations.placeId, parseInt(placeId)),
        lt(reservations.startTime, dayEnd),
        gt(reservations.endTime, dayStart)
      )
    )
    .orderBy(asc(reservations.startTime));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { placeId, startTime, endTime, purpose } = await request.json();

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

  // 중복 체크 — 같은 장소, 시간 겹침
  const conflicts = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.placeId, placeId),
        lt(reservations.startTime, end),
        gt(reservations.endTime, start)
      )
    );

  if (conflicts.length > 0) {
    return NextResponse.json({ error: '해당 시간에 이미 예약이 있습니다.' }, { status: 409 });
  }

  const [created] = await db
    .insert(reservations)
    .values({
      userId: session.user.id,
      placeId,
      startTime: start,
      endTime: end,
      purpose: purpose.trim(),
    })
    .returning();

  await db.insert(reservationHistories).values({
    reservationId: created.id,
    actorUserId: session.user.id,
    actorUserName: session.user.name,
    actionType: 'created',
    changes: JSON.stringify({}),
  });

  return NextResponse.json(created, { status: 201 });
}
