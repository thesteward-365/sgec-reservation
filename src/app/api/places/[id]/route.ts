import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const placeId = parseInt(id);
  if (isNaN(placeId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const [place] = await db
    .select({
      id: places.id,
      name: places.name,
      description: places.description,
      floorId: places.floorId,
      floorName: floors.name,
    })
    .from(places)
    .leftJoin(floors, eq(places.floorId, floors.id))
    .where(eq(places.id, placeId));

  if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const tagRows = await db
    .select({ id: tags.id, name: tags.name })
    .from(placeTags)
    .leftJoin(tags, eq(placeTags.tagId, tags.id))
    .where(eq(placeTags.placeId, placeId));

  return NextResponse.json({ ...place, tags: tagRows });
}
