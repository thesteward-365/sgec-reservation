import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags, reservations } from '@/lib/db/schema';
import { eq, inArray, and, lt, gt, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const floorIdParam = searchParams.get('floorId');
  const tagIdParam = searchParams.get('tagId');
  const date = searchParams.get('date'); // YYYY-MM-DD

  let query = db
    .select({
      id: places.id,
      name: places.name,
      description: places.description,
      floorId: places.floorId,
      floorName: floors.name,
    })
    .from(places)
    .leftJoin(floors, eq(places.floorId, floors.id));

  if (floorIdParam) {
    query = query.where(eq(places.floorId, parseInt(floorIdParam))) as typeof query;
  }

  let placeRows = await query;

  if (tagIdParam) {
    const tagPlaces = await db
      .select({ placeId: placeTags.placeId })
      .from(placeTags)
      .where(eq(placeTags.tagId, parseInt(tagIdParam)));

    const tagPlaceIds = tagPlaces.map((r) => r.placeId);
    if (tagPlaceIds.length === 0) return NextResponse.json([]);

    placeRows = placeRows.filter((p) => tagPlaceIds.includes(p.id));
  }

  if (placeRows.length === 0) return NextResponse.json([]);

  const placeIds = placeRows.map((p) => p.id);

  const tagRows = await db
    .select({
      placeId: placeTags.placeId,
      tagId: tags.id,
      tagName: tags.name,
    })
    .from(placeTags)
    .leftJoin(tags, eq(placeTags.tagId, tags.id))
    .where(inArray(placeTags.placeId, placeIds));

  // 날짜별 예약 건수 조회
  let countMap: Record<number, number> = {};
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, mo, d] = date.split('-').map(Number);
    const dayStart = new Date(y, mo - 1, d, 0, 0, 0);
    const dayEnd = new Date(y, mo - 1, d + 1, 0, 0, 0);

    const counts = await db
      .select({
        placeId: reservations.placeId,
        count: sql<number>`count(*)`,
      })
      .from(reservations)
      .where(
        and(
          inArray(reservations.placeId, placeIds),
          lt(reservations.startTime, dayEnd),
          gt(reservations.endTime, dayStart),
        )
      )
      .groupBy(reservations.placeId);

    countMap = Object.fromEntries(counts.map((c) => [c.placeId, Number(c.count)]));
  }

  const result = placeRows.map((place) => ({
    id: place.id,
    name: place.name,
    description: place.description,
    floorId: place.floorId,
    floorName: place.floorName,
    reservationCount: countMap[place.id] ?? 0,
    tags: tagRows
      .filter((t) => t.placeId === place.id)
      .map((t) => ({ id: t.tagId, name: t.tagName })),
  }));

  return NextResponse.json(result);
}
