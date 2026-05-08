import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { floors, places } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const floorId = parseInt(id);
  if (isNaN(floorId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const { name } = await req.json();
    await db.update(floors).set({ name }).where(eq(floors.id, floorId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const floorId = parseInt(id);
  if (isNaN(floorId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    // policy: 'move' | 'cascade' | undefined
    // move: targetFloorId 로 소속 장소 이동 후 삭제
    // cascade: 소속 장소도 함께 삭제
    // undefined: 장소 없을 때만 삭제
    let policy: string | undefined;
    let targetFloorId: number | undefined;

    try {
      const body = await req.json();
      policy = body?.policy;
      targetFloorId = body?.targetFloorId;
    } catch {
      // body 없는 경우 무시
    }

    const linkedPlaces = await db.select().from(places).where(eq(places.floorId, floorId));

    if (linkedPlaces.length > 0) {
      if (policy === 'move' && targetFloorId) {
        await db
          .update(places)
          .set({ floorId: targetFloorId })
          .where(eq(places.floorId, floorId));
      } else if (policy === 'cascade') {
        await db.delete(places).where(eq(places.floorId, floorId));
      } else {
        return NextResponse.json(
          { error: '이 층을 사용하는 장소가 있어 삭제할 수 없습니다.', hasPlaces: true, count: linkedPlaces.length },
          { status: 400 }
        );
      }
    }

    await db.delete(floors).where(eq(floors.id, floorId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
