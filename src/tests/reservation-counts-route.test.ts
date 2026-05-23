import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tables, state } = vi.hoisted(() => ({
  tables: {
    reservations: {
      placeId: 'reservations.place_id',
      startTime: 'reservations.start_time',
      endTime: 'reservations.end_time',
      status: 'reservations.status',
    },
  },
  state: {
    reservationRows: [] as any[],
  },
}));

const eqMock = vi.fn(() => ({}));

vi.mock('@/lib/db', () => {
  class QueryMock {
    from() {
      return this;
    }

    where() {
      return Promise.resolve(state.reservationRows);
    }
  }

  return {
    db: {
      select: vi.fn(() => new QueryMock()),
    },
    reservations: tables.reservations,
    toDbDate: vi.fn((value: Date) => value),
    fromDbDate: vi.fn((value: Date) => value),
  };
});

vi.mock('drizzle-orm', () => ({
  and: vi.fn(() => ({})),
  eq: eqMock,
  gt: vi.fn(() => ({})),
  lt: vi.fn(() => ({})),
}));

describe('/api/reservations/counts route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.reservationRows = [
      {
        placeId: 3,
        startTime: new Date('2026-05-19T01:00:00.000Z'),
        endTime: new Date('2026-05-19T03:00:00.000Z'),
      },
      {
        placeId: 3,
        startTime: new Date('2026-05-20T01:00:00.000Z'),
        endTime: new Date('2026-05-22T03:00:00.000Z'),
      },
    ];
  });

  it('counts reservations per place and day while filtering to active reservations', async () => {
    const { GET } = await import('../app/api/reservations/counts/route');

    const request = {
      nextUrl: new URL(
        'http://localhost/api/reservations/counts?startDate=2026-05-18&endDate=2026-05-24'
      ),
    };
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      3: {
        '2026-05-19': 1,
        '2026-05-20': 1,
        '2026-05-21': 1,
        '2026-05-22': 1,
      },
    });
    expect(eqMock).toHaveBeenCalledWith(
      tables.reservations.status,
      'active'
    );
  });
});
