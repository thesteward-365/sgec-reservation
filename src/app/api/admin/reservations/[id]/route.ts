import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { reservations, reservationHistories, places, users } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { ReservationService } from '@/lib/services/reservation-service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
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
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const [reservation] = await db
      .select({
        id: reservations.id,
        placeId: reservations.placeId,
        placeName: places.name,
        userName: users.name,
        purpose: reservations.purpose,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        status: reservations.status,
      })
      .from(reservations)
      .leftJoin(places, eq(reservations.placeId, places.id))
      .leftJoin(users, eq(reservations.userId, users.id))
      .where(eq(reservations.id, reservationId));

    if (reservation) {
      return NextResponse.json({ 
        ...reservation, 
        isCancelled: reservation.status === 'cancelled' 
      });
    }

    // Fallback for old deleted data (if any)
    const [cancelledHistory] = await db
      .select()
      .from(reservationHistories)
      .where(
        and(
          eq(reservationHistories.reservationId, reservationId),
          eq(reservationHistories.actionType, 'cancelled')
        )
      )
      .orderBy(desc(reservationHistories.createdAt))
      .limit(1);

    if (cancelledHistory) {
      const changes = JSON.parse(cancelledHistory.changes);
      const snapshot = changes.snapshot;
      
      if (snapshot) {
        return NextResponse.json({
          id: reservationId,
          placeId: snapshot.placeId,
          placeName: snapshot.placeName || '삭제된 장소',
          userName: snapshot.userName || '-',
          purpose: snapshot.purpose || '-',
          startTime: snapshot.startTime,
          endTime: snapshot.endTime,
          isCancelled: true,
        });
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Fetch reservation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const reservationId = parseInt(id);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await ReservationService.cancelReservation(reservationId, session.user);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/admin/reservations/[id] error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('찾을 수 없거나') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
