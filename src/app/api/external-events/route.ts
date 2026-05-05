import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { externalEvents } from '@/lib/db/schema';
import { and, lt, gt } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date'); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }

  const [y, mo, d] = date.split('-').map(Number);
  const dayStart = new Date(y, mo - 1, d, 0, 0, 0);
  const dayEnd = new Date(y, mo - 1, d + 1, 0, 0, 0);

  const rows = await db
    .select({
      id: externalEvents.id,
      title: externalEvents.title,
      startTime: externalEvents.startTime,
      endTime: externalEvents.endTime,
    })
    .from(externalEvents)
    .where(
      and(
        lt(externalEvents.startTime, dayEnd),
        gt(externalEvents.endTime, dayStart)
      )
    );

  return NextResponse.json(rows);
}
