import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'sync') {
      // 실제 Google Calendar 동기화 로직
      // 현재는 더미 응답
      return NextResponse.json({
        success: true,
        message: '동기화가 완료되었습니다',
        lastSync: new Date().toISOString(),
      });
    }

    if (action === 'disconnect') {
      // 실제 Google Calendar 연결 해제 로직
      // 현재는 더미 응답
      return NextResponse.json({
        success: true,
        message: 'Google Calendar 연결이 해제되었습니다',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
