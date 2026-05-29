import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db, purposes } from '@/lib/db';
import { sessionOptions, type SessionData } from '@/lib/session';
import { PG_UNIQUE_VIOLATION } from '@/lib/db/db-utils';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const userPurposes = await db.query.purposes.findMany({
    where: eq(purposes.userId, session.user.id),
    orderBy: (purposes, { asc }) => [asc(purposes.createdAt)],
  });

  return NextResponse.json({ purposes: userPurposes.map((p) => p.purpose) });
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { purpose } = (await request.json()) as { purpose: string };
  const trimmedPurpose = purpose?.trim();

  if (!trimmedPurpose) {
    return NextResponse.json({ error: '목적을 입력해주세요.' }, { status: 400 });
  }

  // 개수 제한 확인 (최대 3개)
  const existingCount = await db.query.purposes.findMany({
    where: eq(purposes.userId, session.user.id),
  });

  if (existingCount.length >= 3) {
    return NextResponse.json(
      { error: '목적은 최대 3개까지 등록할 수 있어요.' },
      { status: 400 }
    );
  }

  try {
    await db.insert(purposes).values({
      userId: session.user.id,
      purpose: trimmedPurpose,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return NextResponse.json({ error: '이미 등록된 목적입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: '목적 저장에 실패했어요.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const purpose = searchParams.get('purpose');

  if (!purpose) {
    return NextResponse.json({ error: '삭제할 목적을 지정해주세요.' }, { status: 400 });
  }

  await db
    .delete(purposes)
    .where(and(eq(purposes.userId, session.user.id), eq(purposes.purpose, purpose)));

  return NextResponse.json({ success: true });
}
