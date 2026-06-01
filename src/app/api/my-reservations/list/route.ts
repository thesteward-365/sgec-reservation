import { NextResponse } from 'next/server';
import { db, reservations, places, floors, users, fromDbDate } from '@/lib/db';
import { eq, desc, and, lt, gt } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor'); // startTime (ISO string or unix seconds)
  const limit = parseInt(searchParams.get('limit') || '40', 10);
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
  
  // Filter params (optional, to match existing frontend filters if needed)
  const floorId = searchParams.get('floorId');
  const tagId = searchParams.get('tagId'); // tag filtering is more complex in DB, often handled in memory or with joins
  const includeCancelled = searchParams.get('includeCancelled') === 'true';

  let queryCondition = and(
    // Optional: filter by user if needed, but current API shows all? 
    // The current /api/my-reservations seems to show ALL reservations, not just "mine".
    // Let's stay consistent with current behavior.
  );

  if (!includeCancelled) {
    queryCondition = and(queryCondition, eq(reservations.status, 'active'));
  }

  if (floorId) {
    queryCondition = and(queryCondition, eq(places.floorId, parseInt(floorId, 10)));
  }

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (order === 'desc') {
      queryCondition = and(queryCondition, lt(reservations.startTime, cursorDate));
    } else {
      queryCondition = and(queryCondition, gt(reservations.startTime, cursorDate));
    }
  }

  const rows = await db
    .select({
      id: reservations.id,
      userId: reservations.userId,
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
    .where(queryCondition)
    .orderBy(order === 'desc' ? desc(reservations.startTime) : reservations.startTime)
    .limit(limit);

  const formattedRows = rows.map((r) => ({
    ...r,
    startTime: fromDbDate(r.startTime).toISOString(),
    endTime: fromDbDate(r.endTime).toISOString(),
  }));

  const nextCursor = formattedRows.length === limit 
    ? formattedRows[formattedRows.length - 1].startTime 
    : null;

  return NextResponse.json({
    data: formattedRows,
    nextCursor,
  });
}
