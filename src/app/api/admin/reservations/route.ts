import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { reservations, users, places } from '@/lib/db/schema';
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
      purpose: reservations.purpose,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .leftJoin(places, eq(reservations.placeId, places.id))
    .orderBy(asc(reservations.startTime));

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      startTime: r.startTime instanceof Date ? r.startTime.toISOString() : null,
      endTime: r.endTime instanceof Date ? r.endTime.toISOString() : null,
    }))
  );
}
