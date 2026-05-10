import { NextRequest, NextResponse } from 'next/server';
import { db, reservations, toDbDate, fromDbDate } from '@/lib/db';
import { and, lt, gt } from 'drizzle-orm';

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const startDateParam = searchParams.get('startDate'); // YYYY-MM-DD
  const endDateParam = searchParams.get('endDate');     // YYYY-MM-DD (inclusive)

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!startDateParam || !endDateParam || !dateRe.test(startDateParam) || !dateRe.test(endDateParam)) {
    return NextResponse.json({});
  }

  const [sy, smo, sd] = startDateParam.split('-').map(Number);
  const [ey, emo, ed] = endDateParam.split('-').map(Number);
  // KST range: startDate 00:00:00 to (endDate + 1) 00:00:00
  const rangeStart = new Date(Date.UTC(sy, smo - 1, sd - 1, 15, 0, 0));
  const rangeEnd = new Date(Date.UTC(ey, emo - 1, ed, 15, 0, 0)); // exclusive

  const reservationRows = await db
    .select({
      placeId: reservations.placeId,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
    })
    .from(reservations)
    .where(
      and(
        lt(reservations.startTime, toDbDate(rangeEnd) as any),
        gt(reservations.endTime, toDbDate(rangeStart) as any),
      )
    );

  const countsMap: Record<number, Record<string, number>> = {};
  for (const r of reservationRows) {
    let cur = fromDbDate(r.startTime);
    cur.setHours(0, 0, 0, 0);
    const resEnd = fromDbDate(r.endTime);
    while (cur < resEnd && cur < rangeEnd) {
      if (cur >= rangeStart) {
        const key = formatLocalDate(cur);
        if (!countsMap[r.placeId]) countsMap[r.placeId] = {};
        countsMap[r.placeId][key] = (countsMap[r.placeId][key] ?? 0) + 1;
      }
      cur = new Date(cur);
      cur.setDate(cur.getDate() + 1);
    }
  }

  return NextResponse.json(countsMap);
}
