import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { UserService } from '@/lib/services/user-service';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    if (body.newPassword.length < 8) {
      return NextResponse.json(
        { error: '새 비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    await UserService.changeUserPassword(
      session.user.id,
      body.currentPassword,
      body.newPassword
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH /api/account/password error:', error);
    return NextResponse.json(
      { error: error.message || '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 400 }
    );
  }
}
