import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db, externalEvents } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getGoogleEventUrl } from '@/lib/calendar/calendar-service';

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
    const eventId = parseInt(id);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const [event] = await db
      .select({
        googleEventId: externalEvents.googleEventId,
      })
      .from(externalEvents)
      .where(eq(externalEvents.id, eventId))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const url = await getGoogleEventUrl('event', event.googleEventId);

    if (!url) {
      return NextResponse.json(
        { error: 'Could not find Google Calendar URL' },
        { status: 404 }
      );
    }

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('External event redirect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
