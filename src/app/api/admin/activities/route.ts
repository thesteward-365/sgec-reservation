import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db, toDbDate } from '@/lib/db';
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
      conditions.push(
        gte(reservationHistories.createdAt, toDbDate(new Date(startDateStr)) as any)
      );
    }
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(
        lte(reservationHistories.createdAt, toDbDate(endDate) as any)
      );
    }

    let query: any = db
      .select({
        id: reservationHistories.id,
        actionType: reservationHistories.actionType,
        actorUserId: reservationHistories.actorUserId,
        actorUserName: reservationHistories.actorUserName,
        changes: reservationHistories.changes,
        createdAt: reservationHistories.createdAt,
        reservationId: reservationHistories.reservationId,
        placeName: places.name,
        reservationPurpose: reservations.purpose,
      })
      .from(reservationHistories)
      .leftJoin(reservations, eq(reservationHistories.reservationId, reservations.id))
      .leftJoin(places, eq(reservations.placeId, places.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const history = await query
      .orderBy(desc(reservationHistories.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch all places to resolve placeId changes
    const allPlaces = await db.select({ id: places.id, name: places.name }).from(places);
    const placeMap = new Map(allPlaces.map((p) => [p.id, p.name]));

    const mappedHistory = history.map((item: any) => {
      let changes = item.changes;
      if (typeof changes === 'string') {
        try {
          changes = JSON.parse(changes);
        } catch {
          changes = {};
        }
      }

      // Resolve placeId names
      if (changes?.placeId) {
        changes.placeName = {
          from: placeMap.get(changes.placeId.from) || changes.placeId.from,
          to: placeMap.get(changes.placeId.to) || changes.placeId.to,
        };
        delete changes.placeId;
      }

      return {
        ...item,
        changes,
      };
    });

    return NextResponse.json(mappedHistory);
  } catch (error) {
    console.error('Activities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
