import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { name, phoneNumber } = await request.json();

  if (!name || !phoneNumber) {
    return NextResponse.json({ error: '이름과 전화번호를 입력해주세요.' }, { status: 400 });
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.phoneNumber, phoneNumber),
    });

    if (existing) {
      return NextResponse.json({ error: '이미 가입된 전화번호입니다.' }, { status: 409 });
    }

    const [newUser] = await db.insert(users).values({
      name,
      phoneNumber,
      role: 'user',
      status: 'pending',
    }).returning();

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
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
    return NextResponse.json({ error: '회원가입 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
