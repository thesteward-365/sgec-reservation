import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  sessionUser: { id: 1, role: 'admin', name: '관리자' } as
    | { id: number; role: string; name: string }
    | null,
  settings: {
    googleAccessToken: 'access-token',
    googleRefreshToken: 'refresh-token',
    connectedEmail: 'admin@example.com',
    calendarId: 'reservation-calendar',
    eventCalendarId: 'event-calendar',
  } as Record<string, unknown> | null,
  syncResult: {
    runId: 'sync_run_1',
    status: 'partial' as const,
    counts: {
      reservationCreated: 1,
      reservationUpdated: 2,
      reservationDeleted: 3,
      eventPulled: 4,
      failed: 1,
    },
  },
  recentRuns: [
    {
      id: 'sync_run_1',
      startedAt: '2026-05-11T10:00:00.000Z',
      finishedAt: '2026-05-11T10:01:00.000Z',
      status: 'success' as const,
      reservationSyncStatus: 'success' as const,
      eventSyncStatus: 'success' as const,
      counts: {
        reservationCreated: 1,
        reservationUpdated: 0,
        reservationDeleted: 0,
        eventPulled: 0,
        failed: 0,
      },
    },
  ],
}));

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(async () => ({ user: state.sessionUser })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({})),
}));

vi.mock('@/lib/session', () => ({
  sessionOptions: {},
}));

vi.mock('@/lib/calendar/google-client', () => ({
  getCalendarSettings: vi.fn(async () => state.settings),
  createOAuthClient: vi.fn(() => ({
    revokeToken: vi.fn(),
  })),
}));

vi.mock('@/lib/calendar/calendar-service', () => ({
  syncAll: vi.fn(async () => state.syncResult),
  saveCalendarIds: vi.fn(async () => undefined),
  listRecentSyncRuns: vi.fn(async () => state.recentRuns),
}));

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
  },
  calendarSettings: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
}));

describe('/api/admin/calendar route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.sessionUser = { id: 1, role: 'admin', name: '관리자' };
  });

  it('returns sync result including runId, status, and counts', async () => {
    const { POST } = await import('../app/api/admin/calendar/route');

    const request = new Request('http://localhost/api/admin/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' }),
    });

    const response = await POST(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.runId).toBe('sync_run_1');
    expect(json.status).toBe('partial');
    expect(json.counts).toEqual(state.syncResult.counts);
  });

  it('returns 401 for non-admin sync requests', async () => {
    state.sessionUser = { id: 2, role: 'user', name: '일반 사용자' };
    const { POST } = await import('../app/api/admin/calendar/route');

    const request = new Request('http://localhost/api/admin/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(401);
  });
});
