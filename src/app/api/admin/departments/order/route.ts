import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { db, departments } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderedIds } = body as { orderedIds: number[] };
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: '올바르지 않은 요청 데이터입니다.' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i];
        await tx
          .update(departments)
          .set({ order: i })
          .where(eq(departments.id, id));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH /api/admin/departments/order error:', error);
    return NextResponse.json({ error: error.message || '순서 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
