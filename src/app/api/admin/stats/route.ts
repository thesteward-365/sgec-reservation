import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  places,
  reservationHistories,
  reservations,
  users,
} from '@/lib/db/schema';
import { eq, count, desc } from 'drizzle-orm';

function buildActivityMessage(
  actionType: string,
  actorUserName: string,
  placeName?: string | null
) {
  const place = placeName ? `${placeName} ` : '';
  switch (actionType) {
    case 'created':
      return `${actorUserName}님이 ${place}예약을 생성했습니다`;
    case 'updated':
      return `${actorUserName}님이 ${place}예약을 수정했습니다`;
    case 'cancelled':
      return `${actorUserName}님이 ${place}예약을 취소했습니다`;
    default:
      return `${actorUserName}님이 작업을 수행하였습니다`;
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 승인 대기 사용자 수
    const pendingUsers = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'pending'));

    // 전체 사용자 수
    const totalUsers = await db.select({ count: count() }).from(users);

    // 전체 장소 수
    const totalPlaces = await db.select({ count: count() }).from(places);

    // 전체 예약 수
    const totalReservations = await db
      .select({ count: count() })
      .from(reservations);

    // 최근 활동 항목
    const recentHistory = await db
      .select({
        id: reservationHistories.id,
        actionType: reservationHistories.actionType,
        actorUserName: reservationHistories.actorUserName,
        createdAt: reservationHistories.createdAt,
        placeName: places.name,
      })
      .from(reservationHistories)
      .leftJoin(reservations, eq(reservationHistories.reservationId, reservations.id))
      .leftJoin(places, eq(reservations.placeId, places.id))
      .orderBy(desc(reservationHistories.createdAt))
      .limit(5);

    const recentActivities = recentHistory.map((item) => ({
      id: item.id,
      type: item.actionType,
      message: buildActivityMessage(item.actionType, item.actorUserName, item.placeName),
      timestamp: new Date(item.createdAt).toISOString(),
    }));

    return NextResponse.json({
      pendingUsersCount: pendingUsers[0]?.count || 0,
      totalUsersCount: totalUsers[0]?.count || 0,
      totalPlacesCount: totalPlaces[0]?.count || 0,
      totalReservationsCount: totalReservations[0]?.count || 0,
      recentActivities,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
