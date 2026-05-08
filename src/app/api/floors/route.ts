import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { floors } from '@/lib/db';
import { asc, desc } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';

export async function GET() {
  const rows = await db.select().from(floors).orderBy(asc(floors.order));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    // 마지막 순서 찾기
    const [lastFloor] = await db.select().from(floors).orderBy(desc(floors.order)).limit(1);
    const order = (lastFloor?.order ?? 0) + 1;

    const [newFloor] = await db.insert(floors).values({ name, order }).returning();
    return NextResponse.json(newFloor);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
