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
    // 사용자 조회
    let user = await db.query.users.findFirst({
      where: eq(users.phoneNumber, phoneNumber),
    });

    // 사용자가 없으면 생성 (회원가입 겸용)
    if (!user) {
      const [newUser] = await db.insert(users).values({
        name,
        phoneNumber,
        role: 'user',
        status: 'pending',
      }).returning();
      user = newUser;
    } else {
      // 이름이 다르면 업데이트 (선택 사항, 여기서는 기존 정보 유지)
    }

    // 세션 저장
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.user = {
      id: user.id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
    };
    await session.save();

    return NextResponse.json({ 
      success: true, 
      user: session.user 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '로그인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
