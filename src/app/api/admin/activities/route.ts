import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { reservationHistories, places, reservations } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

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

    const history = await db
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

    return NextResponse.json(history);
  } catch (error) {
    console.error('Activities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
