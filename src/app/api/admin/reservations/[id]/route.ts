import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { reservations, reservationHistories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const reservationId = parseInt(id);
  if (isNaN(reservationId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const deleted = db.transaction((tx) => {
    const removed = tx
      .delete(reservations)
      .where(eq(reservations.id, reservationId))
      .returning()
      .all();

    if (removed.length === 0) return removed;

    tx
      .insert(reservationHistories)
      .values({
        reservationId,
        actorUserId: session.user!.id,
        actorUserName: session.user!.name,
        actionType: 'cancelled',
        changes: JSON.stringify({ cancelled: { from: 'active', to: 'cancelled' } }),
      })
      .run();

    return removed;
  });

  if (deleted.length === 0) {
    return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
