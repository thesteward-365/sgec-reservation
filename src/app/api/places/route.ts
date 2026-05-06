import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags } from '@/lib/db/schema';
import { eq, inArray, desc, asc, max } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';

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
    isPinned: place.isPinned === 1,
    tags: tagRows
      .filter((t) => t.placeId === place.id)
      .map((t) => ({ id: t.tagId, name: t.tagName })),
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, description, floorId, tagIds } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const [maxRow] = await db.select({ val: max(places.sortOrder) }).from(places);
    const nextOrder = (maxRow?.val ?? -1) + 1;

    const [newPlace] = await db.insert(places).values({
      name,
      description,
      floorId,
      sortOrder: nextOrder,
    }).returning();

    if (tagIds && tagIds.length > 0) {
      await db.insert(placeTags).values(
        tagIds.map((tagId: number) => ({
          placeId: newPlace.id,
          tagId,
        }))
      );
    }

    return NextResponse.json(newPlace);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
