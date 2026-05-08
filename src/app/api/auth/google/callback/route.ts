import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { createOAuthClient } from '@/lib/calendar/google-client';
import { db } from '@/lib/db';
import { calendarSettings } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/admin/calendar?error=unauthorized', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/admin/calendar?error=access_denied', request.url));
  }

  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(new URL('/admin/calendar?error=token_error', request.url));
    }

    // id_token에서 이메일 파싱 (추가 API 호출 없음)
    let email: string | null = null;
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString());
        email = payload.email ?? null;
      } catch {
        // 파싱 실패 시 null 유지
      }
    }

    // calendarSettings 행이 없으면 생성, 있으면 업데이트
    const existing = await db.select().from(calendarSettings).limit(1).then((rows) => rows[0]);

    const values = {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
      connectedEmail: email,
    };

    if (existing) {
      await db.update(calendarSettings).set(values).where(
        (await import('drizzle-orm')).eq(calendarSettings.id, existing.id)
      );
    } else {
      await db.insert(calendarSettings).values(values);
    }

    return NextResponse.redirect(new URL('/admin/calendar?connected=true', request.url));
  } catch (e) {
    console.error('Google OAuth callback error:', e);
    return NextResponse.redirect(new URL('/admin/calendar?error=callback_error', request.url));
  }
}
