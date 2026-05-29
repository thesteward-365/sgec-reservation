import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { UserService } from '@/lib/services/user-service';

export async function POST() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    await UserService.withdrawUser(session.user.id, session.user.id);

    // 탈퇴 후 세션 파기
    session.destroy();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/account/withdraw error:', error);
    return NextResponse.json(
      { error: error.message || '회원 탈퇴 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
