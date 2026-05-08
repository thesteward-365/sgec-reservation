import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { name, phoneNumber, rememberMe = true } = await request.json();

  if (!name || !phoneNumber) {
    return NextResponse.json({ error: '이름과 전화번호를 입력해주세요.' }, { status: 400 });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.phoneNumber, phoneNumber),
    });

    if (!user) {
      return NextResponse.json({ error: '등록되지 않은 전화번호입니다.' }, { status: 404 });
    }

    if (user.name !== name) {
      return NextResponse.json({ error: '이름 또는 전화번호가 올바르지 않습니다.' }, { status: 401 });
    }

    if (user.status === 'rejected') {
      return NextResponse.json({ error: '가입이 거절되었습니다. 관리자에게 문의해주세요.' }, { status: 403 });
    }

    const options = {
      ...sessionOptions,
      cookieOptions: {
        ...sessionOptions.cookieOptions,
        maxAge: rememberMe ? 60 * 60 * 24 * 365 : undefined,
      },
    };

    const session = await getIronSession<SessionData>(await cookies(), options);
    session.user = {
      id: user.id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
    };
    await session.save();

    return NextResponse.json({ success: true, user: session.user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '로그인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
