import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxy } from '../proxy';
import { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue(
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
    })
  ),
}));

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

describe('Proxy Middleware (proxy.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('HTTP -> HTTPS 자동 프로토콜 리다이렉션 검증', async () => {
    const request = new NextRequest(new URL('http://example.com/reserve'));
    request.headers.set('x-forwarded-proto', 'http');

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://example.com/reserve');
  });

  it('비인증 사용자 접근 시 절대 경로 /login 리다이렉트 및 캐시 방지 검증', async () => {
    const request = new NextRequest(new URL('https://example.com/reserve'));
    request.headers.set('x-forwarded-proto', 'https');

    vi.mocked(getIronSession).mockResolvedValue({
      user: undefined,
    } as any);

    const response = await proxy(request);

    // 절대 경로 검증 (Location: https://example.com/login)
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://example.com/login');
    // 캐시 방지 헤더 검증
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('이미 승인된(approved) 사용자가 로그인/가입 화면 진입 시 /reserve로 절대 경로 리다이렉트', async () => {
    const request = new NextRequest(new URL('https://example.com/login'));
    request.headers.set('x-forwarded-proto', 'https');

    vi.mocked(getIronSession).mockResolvedValue({
      user: { id: 1, name: '테스터', status: 'approved', role: 'user' },
    } as any);

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://example.com/reserve');
  });

  it('승인 대기(pending) 상태의 사용자가 /pending 진입 시 미들웨어가 통과(Pass)시키는지 검증', async () => {
    const request = new NextRequest(new URL('https://example.com/pending'));
    request.headers.set('x-forwarded-proto', 'https');

    vi.mocked(getIronSession).mockResolvedValue({
      user: { id: 1, name: '대기자', status: 'pending', role: 'user' },
    } as any);

    const response = await proxy(request);

    // NextResponse.next()가 호출되면 Next.js는 내부적으로 x-middleware-next 헤더를 세팅합니다.
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('일반 승인 사용자가 권한 내의 경로 진입 시 미들웨어 패스 검증', async () => {
    const request = new NextRequest(new URL('https://example.com/reserve'));
    request.headers.set('x-forwarded-proto', 'https');

    vi.mocked(getIronSession).mockResolvedValue({
      user: { id: 1, name: '승인자', status: 'approved', role: 'user' },
    } as any);

    const response = await proxy(request);

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('일반 사용자가 관리자 경로(/admin) 진입 시 /reserve로 리다이렉트 검증', async () => {
    const request = new NextRequest(new URL('https://example.com/admin/dashboard'));
    request.headers.set('x-forwarded-proto', 'https');

    vi.mocked(getIronSession).mockResolvedValue({
      user: { id: 1, name: '승인자', status: 'approved', role: 'user' },
    } as any);

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://example.com/reserve');
  });
});
