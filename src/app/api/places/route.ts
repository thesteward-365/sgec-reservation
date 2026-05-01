import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const floorIdParam = searchParams.get('floorId');
  const tagIdParam = searchParams.get('tagId');

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

  const result = placeRows.map((place) => ({
    id: place.id,
    name: place.name,
    description: place.description,
    floorId: place.floorId,
    floorName: place.floorName,
    tags: tagRows
      .filter((t) => t.placeId === place.id)
      .map((t) => ({ id: t.tagId, name: t.tagName })),
  }));

  return NextResponse.json(result);
}
