import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { PlaceService } from '@/lib/services/place-service';

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const placeId = parseInt(id);
    if (isNaN(placeId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const { name, description, floorId, tagIds, isPinned } = await req.json();
    
    const updated = await PlaceService.updatePlace(placeId, {
      name,
      description,
      floorId,
      tagIds,
      isPinned: typeof isPinned === 'boolean' ? isPinned : undefined,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /api/places/[id] error:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const placeId = parseInt(id);
    if (isNaN(placeId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await PlaceService.deletePlace(placeId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/places/[id] error:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}
