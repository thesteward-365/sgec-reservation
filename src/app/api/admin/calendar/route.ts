import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import {
  getCalendarSettings,
  createOAuthClient,
  getCalendarClient,
} from '@/lib/calendar/google-client';
import { hasGoogleCalendarConnection } from '@/lib/calendar/google-connection-state';
import {
  syncAll,
  saveCalendarIds,
  listRecentSyncRuns,
} from '@/lib/calendar/calendar-service';
import { db } from '@/lib/db';
import { calendarSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';

async function requireAdmin() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.user || session.user.role !== 'admin') return null;
  return session.user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getCalendarSettings();
  const hasConnection = hasGoogleCalendarConnection(settings);
  
  let connected = hasConnection;
  let needsReauth = false;

  if (hasConnection) {
    // 실제로 클라이언트를 불러와서 토큰이 유효한지(또는 갱신 가능한지) 확인
    const client = await getCalendarClient();
    if (!client) {
      needsReauth = true;
      connected = false;
    }
  }

  const [lastRun] = await listRecentSyncRuns(1);

  return NextResponse.json({
    connected,
    needsReauth,
    email: settings?.connectedEmail ?? null,
    calendarId: settings?.calendarId ?? null,
    eventCalendarId: settings?.eventCalendarId ?? null,
    lastSync: lastRun?.startedAt ?? null,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, calendarId, eventCalendarId } = await request.json();

    if (action === 'sync') {
      const result = await syncAll('manual');
      return NextResponse.json({
        success: true,
        runId: result.runId,
        status: result.status,
        counts: result.counts,
        message: `동기화 ${result.status === 'success' ? '완료' : result.status === 'partial' ? '부분 실패' : '실패'}: 예약 생성 ${result.counts.reservationCreated}건, 수정 ${result.counts.reservationUpdated}건, 취소 ${result.counts.reservationDeleted}건, 행사 ${result.counts.eventPulled}건, 실패 ${result.counts.failed}건`,
        lastSync: new Date().toISOString(),
      });
    }

    if (action === 'save_calendars') {
      if (!calendarId || !eventCalendarId) {
        return NextResponse.json(
          { error: '캘린더 ID를 선택해주세요.' },
          { status: 400 }
        );
      }
      await saveCalendarIds(calendarId, eventCalendarId);
      return NextResponse.json({
        success: true,
        message: '캘린더 설정이 저장되었습니다.',
      });
    }

    if (action === 'disconnect') {
      const settings = await getCalendarSettings();
      if (settings?.googleAccessToken) {
        try {
          const oauth2Client = createOAuthClient();
          await oauth2Client.revokeToken(settings.googleAccessToken);
        } catch {
          // revoke 실패해도 로컬 DB 데이터는 삭제 진행
        }
      }

      if (settings) {
        await db
          .update(calendarSettings)
          .set({
            googleAccessToken: null,
            googleRefreshToken: null,
            googleTokenExpiry: null, // 스키마에서 timestamp(nullable)이므로 null 가능
            connectedEmail: null,
            calendarId: null,
            eventCalendarId: null,
          })
          .where(eq(calendarSettings.id, settings.id));
      }

      return NextResponse.json({
        success: true,
        message: 'Google Calendar 연결이 해제되었습니다.',
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
