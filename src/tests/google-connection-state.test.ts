import { describe, expect, it } from 'vitest';

import { hasGoogleCalendarConnection } from '@/lib/calendar/google-connection-state';

describe('hasGoogleCalendarConnection', () => {
  const now = new Date('2026-05-11T12:00:00.000Z');

  it('returns true when a refresh token exists', () => {
    expect(
      hasGoogleCalendarConnection(
        {
          googleAccessToken: null,
          googleRefreshToken: 'refresh-token',
          googleTokenExpiry: null,
        },
        now
      )
    ).toBe(true);
  });

  it('returns true with a non-expired access token even without a refresh token', () => {
    expect(
      hasGoogleCalendarConnection(
        {
          googleAccessToken: 'access-token',
          googleRefreshToken: null,
          googleTokenExpiry: new Date('2026-05-11T12:30:00.000Z'),
        },
        now
      )
    ).toBe(true);
  });

  it('returns false with only an expired access token', () => {
    expect(
      hasGoogleCalendarConnection(
        {
          googleAccessToken: 'access-token',
          googleRefreshToken: null,
          googleTokenExpiry: new Date('2026-05-11T11:30:00.000Z'),
        },
        now
      )
    ).toBe(false);
  });
});
