import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET() {
  const placeRows = await db
    .select({
      id: places.id,
      name: places.name,
      description: places.description,
      floorId: places.floorId,
      floorName: floors.name,
    })
    .from(places)
    .leftJoin(floors, eq(places.floorId, floors.id));

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
