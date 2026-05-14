import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

import { sessionOptions, SessionData } from '@/lib/session';
import { getSyncRunDetail } from '@/lib/calendar/calendar-service';

type Params = { params: Promise<{ runId: string }> };

async function requireAdmin() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.user || session.user.role !== 'admin') return null;
  return session.user;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { runId } = await params;
  const detail = await getSyncRunDetail(runId);
  if (!detail) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
