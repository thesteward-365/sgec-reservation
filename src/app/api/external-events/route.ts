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
    // Month range in KST: YYYY-MM-01 00:00:00 KST to YYYY-(MM+1)-01 00:00:00 KST
    dayStart = new Date(Date.UTC(y, m - 1, 0, 15, 0, 0));
    dayEnd = new Date(Date.UTC(y, m, 0, 15, 0, 0));
  } else if (date) {
    const [y, mo, d] = date.split('-').map(Number);
    // Day range in KST: YYYY-MM-DD 00:00:00 KST to YYYY-MM-DD+1 00:00:00 KST
    dayStart = new Date(Date.UTC(y, mo - 1, d - 1, 15, 0, 0));
    dayEnd = new Date(Date.UTC(y, mo - 1, d, 15, 0, 0));
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
      isAllDay: externalEvents.isAllDay,
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
      id: r.id,
      title: r.title,
      startTime: fromDbDate(r.startTime).toISOString(),
      endTime: fromDbDate(r.endTime).toISOString(),
      isAllDay: !!r.isAllDay, // 확실히 불리언으로 강제 변환하여 포함
      description: r.description,
    }))
  );
}
