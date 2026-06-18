import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const AUTH_PATHS = ['/login', '/signup'];
const PUBLIC_PATHS = [...AUTH_PATHS, '/privacy'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일 및 API 경로는 무조건 통과 (HTTPS 리다이렉트나 세션 체크 등을 타지 않음)
  if (
    pathname.includes('.') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  const user = session.user;

  // 캐시 방지 헤더를 동반한 리다이렉트 응답 생성 함수
  const redirectWithNoCache = (path: string) => {
    const requestUrl = new URL(request.url);
    const nginxProto = request.headers.get('x-nginx-proto') || requestUrl.protocol.replace(':', '');
    const nginxHost = request.headers.get('x-nginx-host') || requestUrl.host;
    const proto = nginxProto.startsWith('https') ? 'https' : 'http';
    const absoluteUrl = new URL(path, `${proto}://${nginxHost}`);

    const response = NextResponse.redirect(absoluteUrl, 307);
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    return response;
  };

  // /login, /signup: approved 사용자는 /reserve로 (이미 로그인됨)
  if (AUTH_PATHS.includes(pathname)) {
    if (user?.status === 'approved') {
      return redirectWithNoCache('/reserve');
    }
    return NextResponse.next();
  }

  // 그 외 공개 경로 (/privacy 등)는 무조건 통과
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // /pending: 미인증 사용자는 /login으로
  if (pathname === '/pending') {
    if (!user) {
      return redirectWithNoCache('/login');
    }
    return NextResponse.next();
  }

  // 그 외 모든 경로: 인증 필요
  if (!user) {
    return redirectWithNoCache('/login');
  }

  // 관리자 전용 경로 확인
  if (pathname.startsWith('/admin') && user.role !== 'admin') {
    return redirectWithNoCache('/reserve');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
