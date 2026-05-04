import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, reservations } from '@/lib/db/schema';
import { eq, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
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

    // 오늘 예약 수 (간단하게 전체 예약 수로 대체)
    const totalReservations = await db
      .select({ count: count() })
      .from(reservations);

    // 최근 처리 항목 (더미 데이터로 대체 - 실제로는 reservation_history 테이블에서 조회)
    const recentActivities = [
      {
        id: 1,
        type: 'user_approved',
        message: '김철수님이 승인되었습니다',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
      },
      {
        id: 2,
        type: 'reservation_cancelled',
        message: '예약이 취소되었습니다 (본당, 2024-01-15 14:00)',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
      },
      {
        id: 3,
        type: 'place_updated',
        message: '카페 공간 정보가 수정되었습니다',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4시간 전
      },
    ];

    return NextResponse.json({
      pendingUsersCount: pendingUsers[0]?.count || 0,
      totalUsersCount: totalUsers[0]?.count || 0,
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
