import { NextResponse } from 'next/server';
import { db, departments } from '@/lib/db';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db
      .select({ id: departments.id, name: departments.name, order: departments.order })
      .from(departments)
      .orderBy(asc(departments.order), asc(departments.name));
    return NextResponse.json(rows);
  } catch (e: any) {
    console.error('GET /api/departments error:', e);
    return NextResponse.json({ error: '소속 목록을 가져오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
