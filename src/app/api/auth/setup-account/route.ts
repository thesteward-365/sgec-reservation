import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { migrationSchema } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user || user.status === 'rejected' || user.status === 'withdrawn') {
      return NextResponse.json({ error: '유효하지 않은 계정입니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password } = body;

    const validation = migrationSchema.safeParse({ username, password, confirmPassword: password });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.update(users)
      .set({
        username,
        password: hashedPassword,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account setup error:', error);
    return NextResponse.json({ error: '계정 설정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
