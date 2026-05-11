import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  CalendarSettingsOverview,
  type CalendarSettingsOverviewProps,
} from './calendar-settings-overview';

const baseProps: CalendarSettingsOverviewProps = {
  connection: {
    email: 'admin@sgec.kr',
    reservationCalendarName: '성지교회 예약 캘린더',
    eventCalendarName: '성지교회 행사 일정',
    lastSyncLabel: '12분 전',
  },
  recentHistories: [
    {
      id: 'sync_20260511_1030',
      startedAtLabel: '2026년 5월 11일 오전 10:30',
      relativeTimeLabel: '가장 최근 실행',
      reservationStatus: 'failed',
      eventStatus: 'success',
      href: '/admin/calendar/history/sync_20260511_1030',
    },
    {
      id: 'sync_20260511_0912',
      startedAtLabel: '2026년 5월 11일 오전 9:12',
      relativeTimeLabel: '1시간 전',
      reservationStatus: 'success',
      eventStatus: 'success',
      href: '/admin/calendar/history/sync_20260511_0912',
    },
  ],
};

const meta: Meta<typeof CalendarSettingsOverview> = {
  title: 'Components/Admin/CalendarSettingsOverview',
  component: CalendarSettingsOverview,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof CalendarSettingsOverview>;

export const ConnectedWithHistory: Story = {
  args: baseProps,
};

export const RecentFailureFirst: Story = {
  args: {
    ...baseProps,
    recentHistories: [
      {
        id: 'sync_20260511_1030',
        startedAtLabel: '2026년 5월 11일 오전 10:30',
        relativeTimeLabel: '가장 최근 실행',
        reservationStatus: 'failed',
        eventStatus: 'failed',
        href: '/admin/calendar/history/sync_20260511_1030',
      },
      ...baseProps.recentHistories.slice(1),
    ],
  },
};
