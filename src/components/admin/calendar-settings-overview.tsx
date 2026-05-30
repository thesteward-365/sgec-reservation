'use client';

import * as React from 'react';

export interface CalendarSettingsOverviewProps {
  connection: {
    email: string | null;
    reservationCalendarName: string | null;
    eventCalendarName: string | null;
    lastSyncLabel: string;
  };
  recentHistories: {
    id: string;
    startedAtLabel: string;
    relativeTimeLabel: string;
    reservationStatus: string;
    eventStatus: string;
    href: string;
  }[];
}

export const CalendarSettingsOverview: React.FC<
  CalendarSettingsOverviewProps
> = ({ connection }) => {
  return <div>{connection.email}</div>;
};
