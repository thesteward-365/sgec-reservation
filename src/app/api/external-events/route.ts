import { NextRequest, NextResponse } from 'next/server';
import { db, externalEvents, toDbDate, fromDbDate } from '@/lib/db';
import { and, lt, gt } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date'); // YYYY-MM-DD
  const month = searchParams.get('month'); // YYYY-MM

  let dayStart: Date;
  let dayEnd: Date;

  if (month) {
    const [y, m] = month.split('-').map(Number);
    dayStart = new Date(y, m - 1, 1);
    dayEnd = new Date(y, m, 1);
  } else if (date) {
    const [y, mo, d] = date.split('-').map(Number);
    dayStart = new Date(y, mo - 1, d, 0, 0, 0);
    dayEnd = new Date(y, mo - 1, d + 1, 0, 0, 0);
  } else {
    return NextResponse.json(
      { error: 'date or month is required' },
      { status: 400 }
    );
  }

  const rows = await db
    .select({
      id: externalEvents.id,
      title: externalEvents.title,
      startTime: externalEvents.startTime,
      endTime: externalEvents.endTime,
      description: externalEvents.description,
    })
    .from(externalEvents)
    .where(
      and(
        lt(externalEvents.startTime, toDbDate(dayEnd) as any),
        gt(externalEvents.endTime, toDbDate(dayStart) as any)
      )
    );

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      startTime: fromDbDate(r.startTime).toISOString(),
      endTime: fromDbDate(r.endTime).toISOString(),
    }))
  );
}
