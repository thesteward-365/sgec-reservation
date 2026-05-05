import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

type PatchBody =
  | { action: 'approve' | 'reject' }
  | { action: 'set-role'; role: 'user' | 'admin' }
  | { action: 'set-status'; status: 'approved' | 'rejected' };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json() as PatchBody;

  let updateValues: Partial<{ status: 'pending' | 'approved' | 'rejected'; role: 'user' | 'admin' }>;

  switch (body.action) {
    case 'approve':
      updateValues = { status: 'approved' };
      break;
    case 'reject':
      updateValues = { status: 'rejected' };
      break;
    case 'set-role':
      if (body.role !== 'user' && body.role !== 'admin') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateValues = { role: body.role };
      break;
    case 'set-status':
      if (body.status !== 'approved' && body.status !== 'rejected') {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateValues = { status: body.status };
      break;
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set(updateValues)
    .where(eq(users.id, userId))
    .returning({ id: users.id, role: users.role, status: users.status });

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
