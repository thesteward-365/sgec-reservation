import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { reservationHistories, places, reservations } from '@/lib/db/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const conditions = [];
    if (startDateStr) {
      conditions.push(gte(reservationHistories.createdAt, new Date(startDateStr)));
    }
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(reservationHistories.createdAt, endDate));
    }

    const query = db
      .select({
        id: reservationHistories.id,
        actionType: reservationHistories.actionType,
        actorUserId: reservationHistories.actorUserId,
        actorUserName: reservationHistories.actorUserName,
        changes: reservationHistories.changes,
        createdAt: reservationHistories.createdAt,
        reservationId: reservationHistories.reservationId,
        placeName: places.name,
      })
      .from(reservationHistories)
      .leftJoin(reservations, eq(reservationHistories.reservationId, reservations.id))
      .leftJoin(places, eq(reservations.placeId, places.id))
      .orderBy(desc(reservationHistories.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const history = await query;

    return NextResponse.json(history);
  } catch (error) {
    console.error('Activities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
