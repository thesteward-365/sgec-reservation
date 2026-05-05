import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { floors, places } from '@/lib/db/schema';
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
  _req: NextRequest,
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
    // 층에 속한 장소가 있는지 확인
    const [linkedPlace] = await db.select().from(places).where(eq(places.floorId, floorId)).limit(1);
    if (linkedPlace) {
      return NextResponse.json({ error: '이 층을 사용하는 장소가 있어 삭제할 수 없습니다.' }, { status: 400 });
    }

    await db.delete(floors).where(eq(floors.id, floorId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
