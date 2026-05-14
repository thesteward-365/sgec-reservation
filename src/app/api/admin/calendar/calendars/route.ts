import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { listCalendars } from '@/lib/calendar/calendar-service';

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  console.log('Session data:', session);
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const calendars = await listCalendars();
  return NextResponse.json({ calendars });
}
