import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tags, placeTags } from '@/lib/db/schema';
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
  const tagId = parseInt(id);
  if (isNaN(tagId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const { name } = await req.json();
    await db.update(tags).set({ name }).where(eq(tags.id, tagId));
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
  const tagId = parseInt(id);
  if (isNaN(tagId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await db.delete(tags).where(eq(tags.id, tagId));
    await db.delete(placeTags).where(eq(placeTags.tagId, tagId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
