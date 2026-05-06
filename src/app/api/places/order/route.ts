import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { places } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';

// 장소 순서·고정 일괄 저장
// body: { orderedIds: number[], pinnedIds: number[] }
export async function PATCH(req: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderedIds, pinnedIds } = await req.json() as {
      orderedIds: number[];
      pinnedIds: number[];
    };

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds is required' }, { status: 400 });
    }

    const pinnedSet = new Set(pinnedIds ?? []);

    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(places)
        .set({ sortOrder: i, isPinned: pinnedSet.has(orderedIds[i]) ? 1 : 0 })
        .where(eq(places.id, orderedIds[i]));
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[PATCH /api/places/order]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
