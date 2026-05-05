import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';

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
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const placeId = parseInt(id);
  if (isNaN(placeId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const { name, description, floorId, tagIds } = await req.json();
    
    await db.update(places).set({
      name,
      description,
      floorId,
    }).where(eq(places.id, placeId));

    if (tagIds) {
      // 기존 태그 삭제 후 재삽입
      await db.delete(placeTags).where(eq(placeTags.placeId, placeId));
      if (tagIds.length > 0) {
        await db.insert(placeTags).values(
          tagIds.map((tagId: number) => ({
            placeId,
            tagId,
          }))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const placeId = parseInt(id);
  if (isNaN(placeId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await db.delete(places).where(eq(places.id, placeId));
    // placeTags는 cascading deletion 설정이 되어있어야 하지만, 아니면 여기서 삭제
    await db.delete(placeTags).where(eq(placeTags.placeId, placeId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
