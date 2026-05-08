import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags } from '@/lib/db';
import { eq, inArray, desc, asc } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { PlaceService } from '@/lib/services/place-service';

export async function GET() {
  const placeRows = await db
    .select({
      id: places.id,
      name: places.name,
      description: places.description,
      floorId: places.floorId,
      floorName: floors.name,
      sortOrder: places.sortOrder,
      isPinned: places.isPinned,
    })
    .from(places)
    .leftJoin(floors, eq(places.floorId, floors.id))
    .orderBy(desc(places.isPinned), asc(places.sortOrder));

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
    sortOrder: place.sortOrder,
    isPinned: place.isPinned,
    tags: tagRows
      .filter((t) => t.placeId === place.id)
      .map((t) => ({ id: t.tagId, name: t.tagName })),
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, floorId, tagIds } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const newPlace = await PlaceService.createPlace({
      name,
      description,
      floorId,
      tagIds,
    });

    return NextResponse.json(newPlace);
  } catch (error: any) {
    console.error('POST /api/places error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
