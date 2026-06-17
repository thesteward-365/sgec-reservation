import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const AUTH_PATHS = ['/login', '/signup'];
const PUBLIC_PATHS = [...AUTH_PATHS, '/privacy'];

export async function proxy(request: NextRequest) {
  // HTTP -> HTTPS 자동 리다이렉션 (Synology Reverse Proxy의 X-Forwarded-Proto 헤더 기준)
  const isDev = process.env.NODE_ENV === 'development' && !process.env.VITEST;
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host') || '';

  // 프록시 헤더가 전혀 없는 순수 로컬 개발 접속이면서 로컬 호스트/IP인 경우만 로컬로 인정합니다.
  const isLocal =
    !forwardedProto &&
    !forwardedHost &&
    (host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      host.startsWith('192.168.'));

  if (forwardedProto === 'http' && !isDev && !isLocal) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = 'https:';
    httpsUrl.port = ''; // HTTPS 표준 포트(443)로 전환하기 위해 포트 제거
    return NextResponse.redirect(httpsUrl);
  }

  const { pathname } = request.nextUrl;

  // 정적 파일 및 API 경로는 무조건 통과 (HTTPS 리다이렉트나 세션 체크 등을 타지 않음)
  if (
    pathname.includes('.') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // HTTP -> HTTPS 자동 리다이렉션 (Synology Reverse Proxy의 X-Forwarded-Proto 헤더 기준)
  const isDev = process.env.NODE_ENV === 'development' && !process.env.VITEST;
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host') || '';

  // 로컬 호스트, 루프백 IP 및 사설 IP 대역(10.x.x.x, 172.x.x.x, 192.168.x.x)인 경우 로컬 접속으로 인정합니다.
  const isLocal =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.');

  if (forwardedProto === 'http' && !isDev && !isLocal) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = 'https:';
    httpsUrl.port = ''; // HTTPS 표준 포트(443)로 전환하기 위해 포트 제거
    return NextResponse.redirect(httpsUrl);
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  const user = session.user;

  // 프록시 헤더를 신뢰하여 절대 경로를 안전하게 구성하는 헬퍼 함수
  const getAbsoluteUrl = (path: string) => {
    const url = new URL(path, request.url);
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');

    if (forwardedProto) {
      url.protocol = forwardedProto.endsWith(':') ? forwardedProto : `${forwardedProto}:`;
    }
    if (forwardedHost) {
      url.host = forwardedHost;
    }

    return url;
  };

  // 캐시 방지 헤더를 동반한 리다이렉트 응답 생성 함수
  const redirectWithNoCache = (path: string) => {
    const absoluteUrl = getAbsoluteUrl(path);
    const response = NextResponse.redirect(absoluteUrl);
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

