import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { getCalendarSettings, createOAuthClient } from '@/lib/calendar/google-client';
import { syncAll, saveCalendarIds } from '@/lib/calendar/calendar-service';
import { db } from '@/lib/db';
import { calendarSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { syncLogs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

async function requireAdmin() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || session.user.role !== 'admin') return null;
  return session.user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getCalendarSettings();
  const connected = !!(settings?.googleAccessToken && settings?.googleRefreshToken);

  const lastSync = await db
    .select({ timestamp: syncLogs.timestamp })
    .from(syncLogs)
    .orderBy(desc(syncLogs.timestamp))
    .limit(1)
    .then((rows) => rows[0]?.timestamp ?? null);

  return NextResponse.json({
    connected,
    email: settings?.connectedEmail ?? null,
    calendarId: settings?.calendarId ?? null,
    eventCalendarId: settings?.eventCalendarId ?? null,
    lastSync: lastSync ? lastSync.toISOString() : null,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, calendarId, eventCalendarId } = await request.json();

    if (action === 'sync') {
      const { pushed, pulled, deleted } = await syncAll();
      const lastSync = new Date().toISOString();
      return NextResponse.json({
        success: true,
        message: `동기화 완료: 예약 ${pushed}건 업로드, 취소 ${deleted}건 삭제, 행사 ${pulled}건 가져옴`,
        lastSync,
      });
    }

    if (action === 'save_calendars') {
      if (!calendarId || !eventCalendarId) {
        return NextResponse.json({ error: '캘린더 ID를 선택해주세요.' }, { status: 400 });
      }
      await saveCalendarIds(calendarId, eventCalendarId);
      return NextResponse.json({ success: true, message: '캘린더 설정이 저장되었습니다.' });
    }

    if (action === 'disconnect') {
      const settings = await getCalendarSettings();
      if (settings?.googleAccessToken) {
        try {
          const oauth2Client = createOAuthClient();
          await oauth2Client.revokeToken(settings.googleAccessToken);
        } catch {
          // revoke 실패해도 로컬 토큰은 삭제
        }
      }

      if (settings) {
        await db.update(calendarSettings).set({
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
          connectedEmail: null,
          calendarId: null,
          eventCalendarId: null,
        }).where(eq(calendarSettings.id, settings.id));
      }

      return NextResponse.json({ success: true, message: 'Google Calendar 연결이 해제되었습니다.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
