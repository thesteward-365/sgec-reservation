import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { and, eq, ne } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { sessionOptions, type SessionData } from '@/lib/session';

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  // DB에서 최신 정보를 가져옵니다.
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return NextResponse.json(
      { error: '사용자를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  // 세션 정보가 최신인지 확인하고, 다르면 업데이트합니다.
  const isStale =
    session.user.name !== user.name ||
    session.user.phoneNumber !== user.phoneNumber ||
    session.user.role !== user.role ||
    session.user.status !== user.status ||
    session.user.username !== user.username;

  if (isStale) {
    session.user = {
      ...session.user,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      username: user.username || '',
    };
    await session.save();
  }

  return NextResponse.json({
    user: session.user,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    phoneNumber?: string;
  };

  const name = body.name?.trim();
  const phoneNumber = body.phoneNumber?.trim();

  if (!name || !phoneNumber) {
    return NextResponse.json(
      { error: '이름과 휴대전화번호를 입력해주세요.' },
      { status: 400 }
    );
  }

  const duplicate = await db.query.users.findFirst({
    where: and(
      eq(users.phoneNumber, phoneNumber),
      ne(users.id, session.user.id)
    ),
  });

  if (duplicate) {
    return NextResponse.json(
      { error: '이미 사용 중인 휴대전화번호입니다.' },
      { status: 409 }
    );
  }

  const [updatedUser] = await db
    .update(users)
    .set({ name, phoneNumber })
    .where(eq(users.id, session.user.id))
    .returning();

  if (!updatedUser) {
    return NextResponse.json(
      { error: '계정 정보를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  session.user = {
    ...session.user,
    name: updatedUser.name,
    username: updatedUser.username || '',
    phoneNumber: updatedUser.phoneNumber,
  };
  await session.save();

  return NextResponse.json({
    success: true,
    user: session.user,
  });
}
