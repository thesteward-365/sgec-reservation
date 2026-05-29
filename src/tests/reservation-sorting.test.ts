import { describe, expect, it } from 'vitest';

import { compareReservationByDayAndTime } from '@/lib/services/reservation-sorting';

describe('compareReservationByDayAndTime', () => {
  const sameStartShorter = {
    startTime: '2026-05-23T00:00:00.000Z',
    endTime: '2026-05-23T01:00:00.000Z',
  };
  const sameStartLonger = {
    startTime: '2026-05-23T00:00:00.000Z',
    endTime: '2026-05-23T02:00:00.000Z',
  };
  const laterStart = {
    startTime: '2026-05-24T00:00:00.000Z',
    endTime: '2026-05-24T01:00:00.000Z',
  };

  it('sorts by start time first when oldest-first is selected', () => {
    const sorted = [laterStart, sameStartLonger, sameStartShorter].sort(
      (a, b) => compareReservationByDayAndTime(a, b, 'asc')
    );

    expect(sorted).toEqual([sameStartShorter, sameStartLonger, laterStart]);
  });

  it('keeps time ascending within the same day even in latest-first mode', () => {
    const sorted = [sameStartShorter, sameStartLonger, laterStart].sort(
      (a, b) => compareReservationByDayAndTime(a, b, 'desc')
    );

    expect(sorted).toEqual([laterStart, sameStartShorter, sameStartLonger]);
  });
});
