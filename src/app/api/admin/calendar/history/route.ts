import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

import { sessionOptions, SessionData } from '@/lib/session';
import { listRecentSyncRuns } from '@/lib/calendar/calendar-service';

async function requireAdmin() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.user || session.user.role !== 'admin') return null;
  return session.user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Number(new URL(request.url).searchParams.get('limit') ?? '20');
  const runs = await listRecentSyncRuns(Number.isNaN(limit) ? 20 : limit);
  return NextResponse.json({ runs });
}
