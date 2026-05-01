import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const PUBLIC_PATHS = ['/login', '/signup'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일 및 API 경로는 무조건 통과
  if (pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const user = session.user;

  // /login, /signup: approved 사용자는 /reserve로
  if (PUBLIC_PATHS.includes(pathname)) {
    if (user?.status === 'approved') {
      return NextResponse.redirect(new URL('/reserve', request.url));
    }
    return NextResponse.next();
  }

  // /pending: 미인증 사용자는 /login으로
  if (pathname === '/pending') {
    if (!user) return NextResponse.redirect(new URL('/login', request.url));
    return NextResponse.next();
  }

  // 그 외 모든 경로: 인증 + approved 필요
  if (!user) return NextResponse.redirect(new URL('/login', request.url));
  if (user.status !== 'approved') return NextResponse.redirect(new URL('/pending', request.url));

  // 관리자 전용 경로 확인
  if (pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
