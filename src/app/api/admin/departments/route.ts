import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db, departments } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';

// ── GET /api/admin/departments ─────────────────────────────
export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select({ id: departments.id, name: departments.name, order: departments.order })
    .from(departments)
    .orderBy(asc(departments.order), asc(departments.name));

  return NextResponse.json(rows);
}

// ── POST /api/admin/departments ────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '소속 이름을 입력해주세요.' }, { status: 400 });
  }
  if (name.trim().length > 50) {
    return NextResponse.json({ error: '소속 이름은 50자 이하여야 합니다.' }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(departments)
      .values({ name: name.trim() })
      .returning({ id: departments.id, name: departments.name, order: departments.order });
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/admin/departments error:', e);
    const errorCode = e.code || e.cause?.code;
    if (errorCode === '23505') {
      return NextResponse.json({ error: '이미 존재하는 소속입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || '소속 추가 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
