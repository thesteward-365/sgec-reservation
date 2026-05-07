import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  reservationHistories,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const reservationId = parseInt(id);

    const history = await db
      .select()
      .from(reservationHistories)
      .where(eq(reservationHistories.reservationId, reservationId))
      .orderBy(desc(reservationHistories.createdAt));

    const activities = history.map((item) => ({
      ...item,
      changes: JSON.parse(item.changes),
      timestamp: new Date(item.createdAt).toISOString(),
    }));

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Reservation history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
