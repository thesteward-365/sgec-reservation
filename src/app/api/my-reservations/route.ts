import { NextResponse } from 'next/server';
import { db, reservations, places, floors, users, fromDbDate } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: reservations.id,
      placeId: reservations.placeId,
      placeName: places.name,
      floorId: places.floorId,
      floorName: floors.name,
      userName: users.name,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      status: reservations.status,
    })
    .from(reservations)
    .leftJoin(places, eq(reservations.placeId, places.id))
    .leftJoin(floors, eq(places.floorId, floors.id))
    .leftJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.userId, session.user.id))
    .orderBy(asc(reservations.startTime));

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      startTime: fromDbDate(r.startTime).toISOString(),
      endTime: fromDbDate(r.endTime).toISOString(),
    }))
  );
}
