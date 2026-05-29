import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, rememberMe = true } = body;

    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    if (user.status === 'rejected' || user.status === 'withdrawn') {
      const message =
        user.status === 'withdrawn'
          ? '탈퇴한 계정입니다. 재가입이 필요하시면 관리자에게 문의해주세요.'
          : '가입 승인이 거절되었습니다. 관리자에게 문의해주세요.';
      return NextResponse.json({ error: message }, { status: 403 });
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
      username: user.username || '',
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
    };
    await session.save();

    return NextResponse.json({ success: true, user: session.user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
