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
      updatedAt: 'reservations.updated_at',
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
      title: 'external_events.title',
      startTime: 'external_events.start_time',
      endTime: 'external_events.end_time',
      description: 'external_events.description',
    },
    syncLogs: { name: 'sync_logs' },
    calendarSettings: { name: 'calendar_settings' },
    calendarSyncRuns: {
      name: 'calendar_sync_runs',
      startedAt: 'calendar_sync_runs.started_at',
      finishedAt: 'calendar_sync_runs.finished_at',
      reservationSyncStatus: 'calendar_sync_runs.reservation_sync_status',
    },
    calendarSyncItems: {
      name: 'calendar_sync_items',
      reservationId: 'calendar_sync_items.reservation_id',
      processedAt: 'calendar_sync_items.processed_at',
      status: 'calendar_sync_items.status',
      category: 'calendar_sync_items.category',
    },
    places: { tableName: 'places', id: 'places.id', name: 'places.name' },
    users: { tableName: 'users', id: 'users.id', name: 'users.name' },
  },
  state: {
    reservationRows: [] as any[],
    latestHistoryRows: [] as any[],
    externalEventRows: [] as any[],
    itemRows: [] as any[],
    insertedRuns: [] as any[],
    insertedItems: [] as any[],
    logRows: [] as any[],
    externalUpserts: [] as any[],
    reservationUpdates: [] as any[],
    deleteCalls: [] as any[],
    settings: {
      calendarId: 'reservation-calendar',
      eventCalendarId: 'event-calendar',
    } as any,
    calendarClient: null as any,
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ table: a, value: b })),
  and: vi.fn((...args) => ({ type: 'and', args })),
  or: vi.fn((...args) => ({ type: 'or', args })),
  gte: vi.fn((a, b) => ({ table: a, op: '>=', value: b })),
  notInArray: vi.fn((a, b) => ({ table: a, op: 'notIn', value: b })),
  sql: vi.fn(() => ({})),
  isNotNull: vi.fn((a) => ({ table: a, op: 'isNotNull' })),
  desc: vi.fn((a) => ({ table: a, op: 'desc' })),
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
      if (this.table === tables.reservationHistories) rows = state.latestHistoryRows;
      if (this.table === tables.externalEvents) rows = state.externalEventRows;
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

import {
  syncAll,
  syncReservation,
  syncReservationWithRun,
} from '../lib/calendar/calendar-service';

describe('calendar-service new sync logic', () => {
  beforeEach(() => {
    state.reservationRows = [];
    state.latestHistoryRows = [];
    state.externalEventRows = [];
    state.itemRows = [];
    state.insertedRuns = [];
    state.insertedItems = [];
    state.logRows = [];
    state.externalUpserts = [];
    state.reservationUpdates = [];
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

  const baseRes = {
    startTime: new Date('2026-05-20T10:00:00.000Z'),
    endTime: new Date('2026-05-20T11:00:00.000Z'),
    purpose: 'Test',
    placeName: 'Room A',
    userName: 'User 1',
  };

  it('SyncAll: handles New Active Reservation (Insert)', async () => {
    state.reservationRows = [
      {
        ...baseRes,
        id: 1,
        status: 'active',
        googleEventId: null,
        updatedAt: new Date('2026-05-14T10:00:00.000Z'),
      },
    ];
    vi.mocked(state.calendarClient.events.insert).mockResolvedValue({
      data: { id: 'new-google-id' },
    });
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({ data: { items: [] } });

    const result = await syncAll('manual');

    expect(state.calendarClient.events.insert).toHaveBeenCalled();
    expect(result.counts.reservationCreated).toBe(1);
    expect(state.reservationUpdates).toContainEqual({ googleEventId: 'new-google-id' });
    expect(state.insertedItems.find(i => i.reservationId === 1)?.status).toBe('success');
  });

  it('SyncAll: handles Updated Active Reservation (Update)', async () => {
    state.reservationRows = [
      {
        ...baseRes,
        id: 2,
        status: 'active',
        googleEventId: 'existing-id',
        updatedAt: new Date('2026-05-14T11:00:00.000Z'),
      },
    ];
    state.itemRows = [
      {
        processedAt: new Date('2026-05-14T10:00:00.000Z'),
        status: 'success',
        action: 'created',
      },
    ];
    vi.mocked(state.calendarClient.events.update).mockResolvedValue({ data: {} });
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({ data: { items: [] } });

    const result = await syncAll('manual');

    expect(state.calendarClient.events.update).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'existing-id' })
    );
    expect(result.counts.reservationUpdated).toBe(1);
    expect(state.insertedItems.find(i => i.reservationId === 2)?.status).toBe('success');
  });

  it('SyncAll: handles Outdated but not modified (Skip)', async () => {
    state.reservationRows = [
      {
        ...baseRes,
        id: 3,
        status: 'active',
        googleEventId: 'existing-id',
        updatedAt: new Date('2026-05-14T09:00:00.000Z'),
      },
    ];
    state.itemRows = [
      {
        processedAt: new Date('2026-05-14T10:00:00.000Z'),
        status: 'success',
        action: 'updated',
      },
    ];
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({ data: { items: [] } });

    const result = await syncAll('manual');

    expect(state.calendarClient.events.update).not.toHaveBeenCalled();
    expect(result.counts.reservationUpdated).toBe(0);
    expect(state.insertedItems.find(i => i.reservationId === 3)?.status).toBe('skipped');
  });

  it('SyncAll: recreates reservation when missing in Google (404)', async () => {
    state.reservationRows = [
      {
        ...baseRes,
        id: 4,
        status: 'active',
        googleEventId: 'missing-id',
        updatedAt: new Date('2026-05-14T11:00:00.000Z'),
      },
    ];
    state.itemRows = [{ processedAt: new Date('2026-05-14T10:00:00.000Z'), status: 'success' }];
    vi.mocked(state.calendarClient.events.update).mockRejectedValue({ code: 404 });
    vi.mocked(state.calendarClient.events.insert).mockResolvedValue({ data: { id: 'recreated-id' } });
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({ data: { items: [] } });

    const result = await syncAll('manual');

    expect(result.counts.reservationCreated).toBe(1);
    expect(state.reservationUpdates).toContainEqual({ googleEventId: 'recreated-id' });
  });

  it('SyncAll: handles Cancelled with Google ID (Delete)', async () => {
    state.reservationRows = [
      {
        ...baseRes,
        id: 5,
        status: 'cancelled',
        googleEventId: 'id-to-delete',
      },
    ];
    vi.mocked(state.calendarClient.events.delete).mockResolvedValue({ data: {} });
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({ data: { items: [] } });

    const result = await syncAll('manual');

    expect(state.calendarClient.events.delete).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'id-to-delete' })
    );
    expect(result.counts.reservationDeleted).toBe(1);
    expect(state.reservationUpdates).toContainEqual({ googleEventId: null });
  });

  it('SyncAll: cleans up local ID when Cancelled is already missing in Google', async () => {
    state.reservationRows = [
      {
        ...baseRes,
        id: 6,
        status: 'cancelled',
        googleEventId: 'already-gone-id',
      },
    ];
    vi.mocked(state.calendarClient.events.delete).mockRejectedValue({ code: 404 });
    vi.mocked(state.calendarClient.events.list).mockResolvedValue({ data: { items: [] } });

    const result = await syncAll('manual');

    expect(result.counts.reservationDeleted).toBe(1);
    expect(state.reservationUpdates).toContainEqual({ googleEventId: null });
    expect(state.insertedItems.find(i => i.reservationId === 6)?.status).toBe('success');
  });

  it('SyncReservation: handles individual active reservation sync', async () => {
    state.reservationRows = [
      {
        ...baseRes,
        id: 7,
        status: 'active',
        googleEventId: null,
        updatedAt: new Date(),
      },
    ];
    vi.mocked(state.calendarClient.events.insert).mockResolvedValue({ data: { id: 'indiv-id' } });

    const result = await syncReservation(7);

    expect(result.status).toBe('success');
    expect(result.externalEventId).toBe('indiv-id');
    expect(state.reservationUpdates).toContainEqual({ googleEventId: 'indiv-id' });
  });

  it('SyncReservationWithRun: records failure when Google connection is missing', async () => {
    state.reservationRows = [
      {
        ...baseRes,
        id: 8,
        status: 'active',
        googleEventId: null,
        updatedAt: new Date(),
      },
    ];
    state.calendarClient = null;

    const result = await syncReservationWithRun(8, 'system');

    expect(result.status).toBe('failed');
    expect(result.counts.failed).toBe(1);
    expect(state.insertedRuns.length).toBe(1);
    expect(state.insertedItems.find(i => i.reservationId === 8)?.status).toBe('failed');
    expect(state.logRows.some(log => log.level === 'error')).toBe(true);
  });

  describe('External Event Sync Range', () => {
    it('fetches events from 3 months ago to 1 year later', async () => {
      const now = new Date('2026-05-14T12:00:00Z');
      vi.setSystemTime(now);

      // Replicate production calculation (local time)
      const expectedThreeMonthsAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate(),
        0,
        0,
        0
      );
      const expectedOneYearLater = new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        now.getDate()
      );

      vi.mocked(state.calendarClient.events.list).mockResolvedValue({
        data: { items: [] },
      });

      await syncAll('manual');

      expect(state.calendarClient.events.list).toHaveBeenCalledWith(
        expect.objectContaining({
          timeMin: expectedThreeMonthsAgo.toISOString(),
          timeMax: expectedOneYearLater.toISOString(),
        })
      );
    });

    it('deletes future/recent events missing in Google, but keeps old ones', async () => {
      const now = new Date('2026-05-14T12:00:00Z');
      vi.setSystemTime(now);

      const expectedThreeMonthsAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate(),
        0,
        0,
        0
      );

      // Local DB has 3 events
      state.externalEventRows = [
        { googleEventId: 'old-event', startTime: new Date('2025-01-01'), title: 'Old' },
        { googleEventId: 'recent-missing', startTime: new Date('2026-03-01'), title: 'Recent' },
        { googleEventId: 'future-missing', startTime: new Date('2026-06-01'), title: 'Future' },
      ];

      // Google returns nothing
      vi.mocked(state.calendarClient.events.list).mockResolvedValue({
        data: { items: [] },
      });

      await syncAll('manual');

      // In our mock, we check if gte was called with the correct date for externalEvents
      const { gte } = await import('drizzle-orm');
      expect(gte).toHaveBeenCalledWith(tables.externalEvents.startTime, expectedThreeMonthsAgo);
    });

    it('upserts events within the range [3 months ago, 1 year later]', async () => {
      const now = new Date('2026-05-14T12:00:00Z');
      vi.setSystemTime(now);

      const eventInSyncRange = {
        id: 'event-1',
        summary: 'External Event',
        start: { dateTime: '2026-05-20T10:00:00Z' },
        end: { dateTime: '2026-05-20T11:00:00Z' },
      };

      vi.mocked(state.calendarClient.events.list).mockResolvedValue({
        data: { items: [eventInSyncRange] },
      });

      const result = await syncAll('manual');

      expect(result.counts.eventPulled).toBe(1);
      expect(state.externalUpserts.length).toBeGreaterThan(0);
      const upsert = state.externalUpserts.find(u => u.googleEventId === 'event-1');
      expect(upsert).toBeDefined();
      expect(upsert.title).toBe('External Event');
    });
  });
});
