import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db, reservations, users, places, floors, fromDbDate } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: reservations.id,
      userId: reservations.userId,
      userName: users.name,
      placeId: reservations.placeId,
      placeName: places.name,
      floorId: places.floorId,
      floorName: floors.name,
      purpose: reservations.purpose,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
        status: reservations.status,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .leftJoin(places, eq(reservations.placeId, places.id))
    .leftJoin(floors, eq(places.floorId, floors.id))
    .orderBy(asc(reservations.startTime));

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      startTime: fromDbDate(r.startTime).toISOString(),
      endTime: fromDbDate(r.endTime).toISOString(),
    }))
  );
}
