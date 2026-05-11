import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  sessionUser: { id: 1, role: 'admin', name: '관리자' } as
    | { id: number; role: string; name: string }
    | null,
  runs: [
    {
      id: 'sync_run_1',
      startedAt: '2026-05-11T10:00:00.000Z',
      finishedAt: '2026-05-11T10:01:00.000Z',
      status: 'success' as const,
      reservationSyncStatus: 'success' as const,
      eventSyncStatus: 'success' as const,
      counts: {
        reservationCreated: 1,
        reservationUpdated: 2,
        reservationDeleted: 0,
        eventPulled: 4,
        failed: 0,
      },
    },
  ],
  detail: {
    id: 'sync_run_1',
    triggeredBy: 'manual' as const,
    startedAt: '2026-05-11T10:00:00.000Z',
    finishedAt: '2026-05-11T10:01:00.000Z',
    status: 'success' as const,
    reservationSyncStatus: 'success' as const,
    eventSyncStatus: 'success' as const,
    counts: {
      reservationCreated: 1,
      reservationUpdated: 2,
      reservationDeleted: 0,
      eventPulled: 4,
      failed: 0,
    },
    items: [
      {
        id: 1,
        category: 'reservation' as const,
        action: 'created' as const,
        status: 'success' as const,
        reservationId: 1234,
        externalEventId: 'evt-1',
        title: '교역자실 · 회의',
        payload: null,
        errorMessage: null,
        processedAt: '2026-05-11T10:00:10.000Z',
      },
    ],
  } as Record<string, unknown> | null,
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

vi.mock('@/lib/calendar/calendar-service', () => ({
  listRecentSyncRuns: vi.fn(async () => state.runs),
  getSyncRunDetail: vi.fn(async () => state.detail),
}));

describe('/api/admin/calendar/history routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.sessionUser = { id: 1, role: 'admin', name: '관리자' };
    state.detail = {
      id: 'sync_run_1',
      triggeredBy: 'manual',
      startedAt: '2026-05-11T10:00:00.000Z',
      finishedAt: '2026-05-11T10:01:00.000Z',
      status: 'success',
      reservationSyncStatus: 'success',
      eventSyncStatus: 'success',
      counts: {
        reservationCreated: 1,
        reservationUpdated: 2,
        reservationDeleted: 0,
        eventPulled: 4,
        failed: 0,
      },
      items: [
        {
          id: 1,
          category: 'reservation',
          action: 'created',
          status: 'success',
          reservationId: 1234,
          externalEventId: 'evt-1',
          title: '교역자실 · 회의',
          payload: null,
          errorMessage: null,
          processedAt: '2026-05-11T10:00:10.000Z',
        },
      ],
    };
  });

  it('returns recent sync runs for admins', async () => {
    const { GET } = await import('../app/api/admin/calendar/history/route');

    const request = new Request(
      'http://localhost/api/admin/calendar/history?limit=10'
    );

    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.runs).toEqual(state.runs);
  });

  it('returns sync run detail for admins', async () => {
    const { GET } = await import(
      '../app/api/admin/calendar/history/[runId]/route'
    );

    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ runId: 'sync_run_1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe('sync_run_1');
    expect(json.items[0].reservationId).toBe(1234);
  });

  it('returns 404 when sync run detail is missing', async () => {
    state.detail = null;
    const { GET } = await import(
      '../app/api/admin/calendar/history/[runId]/route'
    );

    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ runId: 'missing-run' }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 401 for non-admin history requests', async () => {
    state.sessionUser = { id: 2, role: 'user', name: '일반 사용자' };
    const { GET } = await import('../app/api/admin/calendar/history/route');

    const response = await GET(
      new Request('http://localhost/api/admin/calendar/history') as never
    );

    expect(response.status).toBe(401);
  });
});
