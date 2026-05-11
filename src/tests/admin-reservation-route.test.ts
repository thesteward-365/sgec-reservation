import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tables, state } = vi.hoisted(() => ({
  tables: {
    reservations: { name: 'reservations' },
    reservationHistories: { name: 'reservation_histories' },
    calendarSyncItems: { name: 'calendar_sync_items' },
    places: { name: 'places' },
    users: { name: 'users' },
  },
  state: {
    sessionUser: { id: 1, role: 'admin', name: '관리자' } as
      | { id: number; role: string; name: string }
      | null,
    reservationRows: [] as any[],
    historyRows: [] as any[],
    syncItemRows: [] as any[],
    googleEventUrl: 'https://calendar.google.com/event?eid=abc',
  },
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
  getGoogleEventUrl: vi.fn(async () => state.googleEventUrl),
}));

vi.mock('@/lib/services/reservation-service', () => ({
  ReservationService: {
    cancelReservation: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => {
  class QueryMock {
    table: any;

    from(table: any) {
      this.table = table;
      return this;
    }

    leftJoin() {
      return this;
    }

    where() {
      return this;
    }

    orderBy() {
      return this;
    }

    limit() {
      return this;
    }

    then(resolve: (value: any[]) => any) {
      let rows: any[] = [];

      if (this.table === tables.reservations) rows = state.reservationRows;
      if (this.table === tables.reservationHistories) rows = state.historyRows;
      if (this.table === tables.calendarSyncItems) rows = state.syncItemRows;

      return Promise.resolve(resolve(rows));
    }
  }

  return {
    db: {
      select: vi.fn(() => new QueryMock()),
    },
  };
});

vi.mock('@/lib/db/schema', () => ({
  reservations: tables.reservations,
  reservationHistories: tables.reservationHistories,
  calendarSyncItems: tables.calendarSyncItems,
  places: tables.places,
  users: tables.users,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
}));

describe('/api/admin/reservations/[id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.sessionUser = { id: 1, role: 'admin', name: '관리자' };
    state.reservationRows = [
      {
        id: 1,
        placeId: 1,
        placeName: '본당',
        userName: '홍길동',
        purpose: '예배 준비',
        startTime: new Date('2026-05-20T10:00:00.000Z'),
        endTime: new Date('2026-05-20T11:00:00.000Z'),
        status: 'active',
        googleEventId: 'evt-1',
      },
    ];
    state.historyRows = [
      {
        createdAt: new Date('2026-05-20T09:00:00.000Z'),
      },
    ];
    state.syncItemRows = [
      {
        processedAt: new Date('2026-05-20T09:30:00.000Z'),
        externalEventId: 'evt-1',
      },
    ];
    state.googleEventUrl = 'https://calendar.google.com/event?eid=abc';
  });

  it('returns synced google sync status when latest change is already reflected', async () => {
    const { GET } = await import('../app/api/admin/reservations/[id]/route');

    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: '1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.googleSync).toMatchObject({
      status: 'synced',
      label: '동기화됨',
    });
  });

  it('returns pending google sync status when there is no successful sync item', async () => {
    state.syncItemRows = [];
    const { GET } = await import('../app/api/admin/reservations/[id]/route');

    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: '1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.googleSync).toMatchObject({
      status: 'pending',
      label: '동기화 필요',
    });
  });

  it('returns missing event status when googleEventId is absent', async () => {
    state.reservationRows = [
      {
        id: 1,
        placeId: 1,
        placeName: '본당',
        userName: '홍길동',
        purpose: '예배 준비',
        startTime: new Date('2026-05-20T10:00:00.000Z'),
        endTime: new Date('2026-05-20T11:00:00.000Z'),
        status: 'active',
        googleEventId: null,
      },
    ];
    const { GET } = await import('../app/api/admin/reservations/[id]/route');

    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: '1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.googleSync).toMatchObject({
      status: 'missing_event',
      label: 'Google 이벤트 없음',
    });
  });
});
