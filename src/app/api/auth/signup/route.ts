import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq, or } from 'drizzle-orm';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { signupSchema } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, phoneNumber } = body;

    const validation = signupSchema.safeParse({
      username,
      password,
      name,
      phoneNumber,
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await db.query.users.findFirst({
      where: or(
        eq(users.username, username),
        eq(users.phoneNumber, phoneNumber)
      ),
    });
    if (existing) {
      if (existing.username === username) {
        return NextResponse.json(
          { error: '이미 사용 중인 아이디입니다.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: '이미 가입된 전화번호입니다.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        name,
        phoneNumber,
        role: 'user',
        status: 'pending',
      })
      .returning();

    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    session.user = {
      id: newUser.id,
      name: newUser.name,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      status: newUser.status,
    };
    await session.save();

    return NextResponse.json({ success: true, user: session.user });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
