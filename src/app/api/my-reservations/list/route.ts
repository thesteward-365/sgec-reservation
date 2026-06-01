import { NextResponse } from 'next/server';
import { db, reservations, places, floors, users, fromDbDate } from '@/lib/db';
import { eq, desc, and, lt, gt, sql } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '40', 10);
  const offset = (page - 1) * limit;
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
  
  // Filter params (optional, to match existing frontend filters if needed)
  const floorId = searchParams.get('floorId');
  const includeCancelled = searchParams.get('includeCancelled') === 'true';

  let queryCondition = and();

  if (!includeCancelled) {
    queryCondition = and(queryCondition, eq(reservations.status, 'active'));
  }

  if (floorId) {
    queryCondition = and(queryCondition, eq(places.floorId, parseInt(floorId, 10)));
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
    .orderBy(
      // 1. Date (KST timezone fixed to avoid 8AM shifting to yesterday)
      order === 'desc' 
        ? desc(sql`DATE(${reservations.startTime} AT TIME ZONE 'Asia/Seoul')`) 
        : sql`DATE(${reservations.startTime} AT TIME ZONE 'Asia/Seoul')`,
      // 2. Time (Always ASC within the same day as requested)
      sql`(${reservations.startTime} AT TIME ZONE 'Asia/Seoul')::time ASC`,
      // 3. End Time (ASC for same start time)
      sql`(${reservations.endTime} AT TIME ZONE 'Asia/Seoul')::time ASC`,
      // 4. ID for deterministic sorting
      reservations.id
    )
    .limit(limit)
    .offset(offset);

  const formattedRows = rows.map((r) => ({
    ...r,
    startTime: fromDbDate(r.startTime).toISOString(),
    endTime: fromDbDate(r.endTime).toISOString(),
  }));

  const hasMore = formattedRows.length === limit;

  return NextResponse.json({
    data: formattedRows,
    nextPage: hasMore ? page + 1 : null,
  });
}
