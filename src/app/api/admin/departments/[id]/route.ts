import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db, departments } from '@/lib/db';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/admin/departments/[id] ─────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deptId = parseInt(id);
  if (isNaN(deptId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '소속 이름을 입력해주세요.' }, { status: 400 });
  }
  if (name.trim().length > 50) {
    return NextResponse.json({ error: '소속 이름은 50자 이하여야 합니다.' }, { status: 400 });
  }

  try {
    const rows = await db
      .update(departments)
      .set({ name: name.trim() })
      .where(eq(departments.id, deptId))
      .returning({ id: departments.id, name: departments.name, order: departments.order });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (e: any) {
    if (e.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 소속입니다.' }, { status: 409 });
    }
    throw e;
  }
}

// ── DELETE /api/admin/departments/[id] ────────────────────
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const deptId = parseInt(id);
    if (isNaN(deptId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await db.delete(departments).where(eq(departments.id, deptId));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/admin/departments/[id] error:', e);
    return NextResponse.json({ error: e.message || '소속 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
