import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function proxy(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const { pathname } = request.nextUrl;

  // 1. 공개 경로 허용
  const isPublicPath = pathname === '/login' || pathname.startsWith('/api/auth');
  const isStaticFile = pathname.includes('.') || pathname.startsWith('/_next');
  
  if (isPublicPath || isStaticFile) {
    return NextResponse.next();
  }

  // 2. 로그인 여부 확인
  if (!session.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. 승인 상태 확인 (관리자 제외)
  const isPendingPath = pathname === '/pending';
  if (session.user.role !== 'admin' && session.user.status !== 'approved' && !isPendingPath) {
    return NextResponse.redirect(new URL('/pending', request.url));
  }

  // 4. 관리자 전용 경로 확인
  if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
