/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tables, state } = vi.hoisted(() => ({
  tables: {
    reservations: {
      name: 'reservations',
      id: 'reservations.id',
      startTime: 'reservations.start_time',
      endTime: 'reservations.end_time',
      purpose: 'reservations.purpose',
      googleEventId: 'reservations.google_event_id',
      placeId: 'reservations.place_id',
      userId: 'reservations.user_id',
      status: 'reservations.status',
    },
    reservationHistories: {
      name: 'reservation_histories',
      id: 'reservation_histories.id',
      reservationId: 'reservation_histories.reservation_id',
      googleEventId: 'reservation_histories.google_event_id',
      changes: 'reservation_histories.changes',
      actionType: 'reservation_histories.action_type',
      createdAt: 'reservation_histories.created_at',
    },
    externalEvents: {
      name: 'external_events',
      googleEventId: 'external_events.google_event_id',
    },
    syncLogs: { name: 'sync_logs' },
    calendarSettings: { name: 'calendar_settings' },
    calendarSyncRuns: {
      name: 'calendar_sync_runs',
      startedAt: 'calendar_sync_runs.started_at',
      finishedAt: 'calendar_sync_runs.finished_at',
      reservationSyncStatus: 'calendar_sync_runs.reservation_sync_status',
    },
    calendarSyncItems: { name: 'calendar_sync_items' },
    places: { tableName: 'places', id: 'places.id', name: 'places.name' },
    users: { tableName: 'users', id: 'users.id', name: 'users.name' },
  },
  state: {
    reservationRows: [] as any[],
    cancellationRows: [] as any[],
    updatedHistoryRows: [] as any[],
    latestHistoryRows: [] as any[],
    runRows: [] as any[],
    itemRows: [] as any[],
    insertedRuns: [] as any[],
    insertedItems: [] as any[],
    logRows: [] as any[],
    externalUpserts: [] as any[],
    reservationUpdates: [] as any[],
    historyUpdates: [] as any[],
    deleteCalls: [] as any[],
    settings: {
      calendarId: 'reservation-calendar',
      eventCalendarId: 'event-calendar',
    } as any,
    calendarClient: null as any,
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  gte: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
  isNotNull: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
}));

vi.mock('../lib/calendar/google-client', () => ({
  getCalendarClient: vi.fn(async () => state.calendarClient),
  getCalendarSettings: vi.fn(async () => state.settings),
}));

vi.mock('../lib/db', () => {
  class QueryMock {
    table: any;
    shape: any;

    constructor(shape?: any) {
      this.shape = shape;
    }

    from(table: any) {
      this.table = table;
      return this;
    }

    innerJoin() {
      return this;
    }

    leftJoin() {
      return this;
    }

    where() {
      return this;
    }

    limit() {
      return this;
    }

    orderBy() {
      return this;
    }

    then(resolve: (value: any[]) => any) {
      let rows: any[] = [];

      if (this.table === tables.reservations) rows = state.reservationRows;
      if (this.table === tables.reservationHistories) {
        if (this.shape?.googleEventId) {
          rows = state.cancellationRows;
        } else if (this.shape?.reservationId && !this.shape?.changes) {
          rows = state.updatedHistoryRows;
        } else if (this.shape?.changes) {
          rows = state.latestHistoryRows;
        }
      }
      if (this.table === tables.calendarSyncRuns) rows = state.runRows;
      if (this.table === tables.calendarSyncItems) rows = state.itemRows;

      return Promise.resolve(resolve(rows));
    }
  }

  const db = {
    select: vi.fn((shape?: any) => new QueryMock(shape)),
    insert: vi.fn((table: any) => ({
      values: vi.fn((payload: any) => {
        if (table === tables.syncLogs) {
          state.logRows.push(payload);
        } else if (table === tables.calendarSyncRuns) {
          state.insertedRuns.push(payload);
        } else if (table === tables.calendarSyncItems) {
          state.insertedItems.push(...payload);
        } else if (table === tables.externalEvents) {
          state.externalUpserts.push(payload);
        }

        return {
          onConflictDoUpdate: vi.fn((config: any) => {
            state.externalUpserts.push(config);
            return Promise.resolve();
          }),
          then: (resolve: (value: any) => any) =>
            Promise.resolve(resolve([])),
        };
      }),
    })),
    update: vi.fn((table: any) => ({
      set: vi.fn((payload: any) => ({
        where: vi.fn(() => {
          if (table === tables.reservations) {
            state.reservationUpdates.push(payload);
          } else if (table === tables.reservationHistories) {
            state.historyUpdates.push(payload);
          }

          return Promise.resolve([]);
        }),
      })),
    })),
    delete: vi.fn((table: any) => {
      const call = { table, whereCalled: false };
      state.deleteCalls.push(call);
      return {
        where: vi.fn(() => {
          call.whereCalled = true;
          return Promise.resolve([]);
        }),
        then: (resolve: (value: any) => any) => Promise.resolve(resolve([])),
      };
    }),
  };

  return {
    db,
    reservations: tables.reservations,
    reservationHistories: tables.reservationHistories,
    externalEvents: tables.externalEvents,
    syncLogs: tables.syncLogs,
    calendarSettings: tables.calendarSettings,
    calendarSyncRuns: tables.calendarSyncRuns,
    calendarSyncItems: tables.calendarSyncItems,
    places: tables.places,
    users: tables.users,
  };
});

import { syncAll } from '../lib/calendar/calendar-service';

describe('calendar-service syncAll', () => {
  beforeEach(() => {
    state.reservationRows = [];
    state.cancellationRows = [];
    state.updatedHistoryRows = [];
    state.latestHistoryRows = [];
    state.runRows = [];
    state.itemRows = [];
    state.insertedRuns = [];
    state.insertedItems = [];
    state.logRows = [];
    state.externalUpserts = [];
    state.reservationUpdates = [];
    state.historyUpdates = [];
    state.deleteCalls = [];
    state.settings = {
      calendarId: 'reservation-calendar',
      eventCalendarId: 'event-calendar',
    };
    state.calendarClient = {
      events: {
        list: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      calendarList: {
        list: vi.fn(),
      },
    };
    vi.clearAllMocks();
  });

  it('paginates external events and records pulled items', async () => {
    vi.mocked(state.calendarClient.events.list)
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'evt-1',
              summary: '행사 1',
              start: { dateTime: '2026-05-11T10:00:00.000Z' },
              end: { dateTime: '2026-05-11T11:00:00.000Z' },
            },
          ],
          nextPageToken: 'next-token',
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'evt-2',
              summary: '행사 2',
              start: { dateTime: '2026-05-12T10:00:00.000Z' },
              end: { dateTime: '2026-05-12T11:00:00.000Z' },
            },
          ],
        },
      });

    const result = await syncAll('manual');

    expect(state.calendarClient.events.list).toHaveBeenCalledTimes(2);
    expect(result.counts.eventPulled).toBe(2);
    expect(result.status).toBe('success');
    expect(state.insertedRuns).toHaveLength(1);
    expect(state.insertedItems).toHaveLength(2);
    expect(state.logRows.every((row) => row.runId === result.runId)).toBe(true);
  });

  it('deletes local external events when Google returns zero events', async () => {
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({
      data: { items: [] },
    });

    const result = await syncAll('manual');

    expect(result.counts.eventPulled).toBe(0);
    expect(state.deleteCalls.some((call) => call.table === tables.externalEvents)).toBe(true);
  });

  it('returns partial when reservation sync fails but event sync succeeds', async () => {
    state.reservationRows = [
      {
        id: 1,
        startTime: new Date('2026-05-20T10:00:00.000Z'),
        endTime: new Date('2026-05-20T11:00:00.000Z'),
        purpose: '회의',
        googleEventId: null,
        placeName: '회의실 A',
        userName: '홍길동',
      },
    ];
    state.latestHistoryRows = [
      {
        changes: JSON.stringify({
          created: {
            to: {
              placeId: 1,
              startTime: '2026-05-20T10:00:00.000Z',
              endTime: '2026-05-20T11:00:00.000Z',
              purpose: '회의',
            },
          },
        }),
      },
    ];
    vi.mocked(state.calendarClient.events.insert).mockRejectedValueOnce(
      new Error('insert failed')
    );
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({
      data: {
        items: [
          {
            id: 'evt-1',
            summary: '행사 1',
            start: { dateTime: '2026-05-11T10:00:00.000Z' },
            end: { dateTime: '2026-05-11T11:00:00.000Z' },
          },
        ],
      },
    });

    const result = await syncAll('manual');

    expect(result.status).toBe('partial');
    expect(result.reservationSyncStatus).toBe('failed');
    expect(result.eventSyncStatus).toBe('success');
    expect(result.counts.failed).toBe(1);
  });

  it('recreates reservation event when update returns 404', async () => {
    state.reservationRows = [
      {
        id: 2,
        startTime: new Date('2026-05-20T10:00:00.000Z'),
        endTime: new Date('2026-05-20T11:00:00.000Z'),
        purpose: '리더 모임',
        googleEventId: 'old-event',
        placeName: '세미나실',
        userName: '김민수',
      },
    ];
    state.runRows = [
      {
        startedAt: new Date('2026-05-19T00:00:00.000Z'),
        finishedAt: new Date('2026-05-19T00:01:00.000Z'),
        reservationSyncStatus: 'success',
      },
    ];
    state.updatedHistoryRows = [{ reservationId: 2 }];
    state.latestHistoryRows = [
      {
        changes: JSON.stringify({
          purpose: { from: '이전 모임', to: '리더 모임' },
        }),
      },
    ];
    vi.mocked(state.calendarClient.events.update).mockRejectedValueOnce({
      code: 404,
    });
    vi.mocked(state.calendarClient.events.insert).mockResolvedValueOnce({
      data: { id: 'new-event' },
    });
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({
      data: { items: [] },
    });

    const result = await syncAll('manual');

    expect(result.counts.reservationUpdated).toBe(1);
    expect(state.reservationUpdates).toContainEqual({ googleEventId: 'new-event' });
    expect(result.status).toBe('success');
  });

  it('does not update already-synced reservations without recent history changes', async () => {
    state.reservationRows = [
      {
        id: 3,
        startTime: new Date('2026-05-21T10:00:00.000Z'),
        endTime: new Date('2026-05-21T11:00:00.000Z'),
        purpose: '변경 없음',
        googleEventId: 'existing-event',
        placeName: '회의실 B',
        userName: '박서준',
      },
    ];
    state.runRows = [
      {
        startedAt: new Date('2026-05-20T00:00:00.000Z'),
        finishedAt: new Date('2026-05-20T00:01:00.000Z'),
        reservationSyncStatus: 'success',
      },
    ];
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({
      data: { items: [] },
    });

    const result = await syncAll('manual');

    expect(result.counts.reservationUpdated).toBe(0);
    expect(vi.mocked(state.calendarClient.events.update)).not.toHaveBeenCalled();
    expect(result.status).toBe('success');
  });

  it('updates only reservations changed since the last successful sync', async () => {
    state.reservationRows = [
      {
        id: 4,
        startTime: new Date('2026-05-22T10:00:00.000Z'),
        endTime: new Date('2026-05-22T11:00:00.000Z'),
        purpose: '수정 대상',
        googleEventId: 'event-4',
        placeName: '회의실 C',
        userName: '이수진',
      },
      {
        id: 5,
        startTime: new Date('2026-05-23T10:00:00.000Z'),
        endTime: new Date('2026-05-23T11:00:00.000Z'),
        purpose: '스킵 대상',
        googleEventId: 'event-5',
        placeName: '회의실 D',
        userName: '정우성',
      },
    ];
    state.runRows = [
      {
        startedAt: new Date('2026-05-20T00:00:00.000Z'),
        finishedAt: new Date('2026-05-20T00:01:00.000Z'),
        reservationSyncStatus: 'success',
      },
    ];
    state.updatedHistoryRows = [{ reservationId: 4 }];
    state.latestHistoryRows = [
      {
        changes: JSON.stringify({
          purpose: { from: '수정 전', to: '수정 대상' },
        }),
      },
    ];
    vi.mocked(state.calendarClient.events.update).mockResolvedValue({
      data: {},
    } as any);
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({
      data: { items: [] },
    });

    const result = await syncAll('manual');

    expect(result.counts.reservationUpdated).toBe(1);
    expect(vi.mocked(state.calendarClient.events.update)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(state.calendarClient.events.update)).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'event-4' })
    );
  });
});
