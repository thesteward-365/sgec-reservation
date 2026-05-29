import { describe, expect, it } from 'vitest';

import {
  formatExternalEventDateRangeLabel,
  formatExternalEventTimeRangeLabel,
  getExternalEventDateRange,
  isExternalEventAllDay,
} from '@/lib/external-event-dates';

describe('external event date display helpers', () => {
  it('treats Google all-day end dates as exclusive', () => {
    const event = {
      startTime: '2026-05-01T15:00:00.000Z',
      endTime: '2026-05-02T15:00:00.000Z',
      isAllDay: true,
    };

    expect(getExternalEventDateRange(event)).toEqual({
      startDate: '2026-05-02',
      endDate: '2026-05-02',
    });
    expect(
      formatExternalEventDateRangeLabel(event, {
        includeAllDaySuffix: true,
      })
    ).toBe('5월 2일');
  });

  it('keeps multi-day all-day events on their visible dates', () => {
    const event = {
      startTime: '2026-05-01T15:00:00.000Z',
      endTime: '2026-05-04T15:00:00.000Z',
      isAllDay: true,
    };

    expect(getExternalEventDateRange(event)).toEqual({
      startDate: '2026-05-02',
      endDate: '2026-05-04',
    });
    expect(
      formatExternalEventDateRangeLabel(event, {
        includeAllDaySuffix: true,
      })
    ).toBe('5월 2일 ~ 5월 4일');
  });

  it('does not show timed events ending at midnight on the next day', () => {
    const event = {
      startTime: '2026-05-02T13:00:00.000Z',
      endTime: '2026-05-02T15:00:00.000Z',
      isAllDay: false,
    };

    expect(getExternalEventDateRange(event)).toEqual({
      startDate: '2026-05-02',
      endDate: '2026-05-02',
    });
    expect(formatExternalEventTimeRangeLabel(event)).toBe('22:00 - 00:00');
  });

  it('formats multi-day timed events with dates and times', () => {
    const event = {
      startTime: '2026-05-02T13:00:00.000Z',
      endTime: '2026-05-03T01:30:00.000Z',
      isAllDay: false,
    };

    expect(isExternalEventAllDay(event)).toBe(false);
    expect(getExternalEventDateRange(event)).toEqual({
      startDate: '2026-05-02',
      endDate: '2026-05-03',
    });
    expect(formatExternalEventTimeRangeLabel(event)).toBe(
      '5월 2일 22:00 - 5월 3일 10:30'
    );
  });
});
