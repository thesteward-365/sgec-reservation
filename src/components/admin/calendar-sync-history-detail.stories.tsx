import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  CalendarSyncHistoryDetail,
  type CalendarSyncHistoryDetailProps,
} from './calendar-sync-history-detail';

const baseRun: CalendarSyncHistoryDetailProps['run'] = {
  status: 'partial',
  trigger: 'manual',
  startedAtLabel: '2026년 5월 11일 오전 10:30 동기화',
  durationLabel: '18초',
  summary: {
    reservationSyncStatus: 'failed',
    eventSyncStatus: 'success',
  },
  items: [
    {
      id: 'item-1',
      category: 'reservation',
      status: 'success',
      action: 'created',
      title: '중예배실 · 수요예배 리허설',
      timeLabel: '10:30',
      href: '/admin/reservations/418',
      fields: [
        { label: '예약자', value: '김민수' },
        { label: '장소', value: '중예배실' },
        { label: '날짜', value: '5월 14일 (목)' },
        { label: '시간', value: '19:00 ~ 21:00' },
        { label: '사용 목적', value: '수요예배 리허설' },
      ],
    },
    {
      id: 'item-2',
      category: 'reservation',
      status: 'success',
      action: 'updated',
      title: '2층 세미나실 · 청년부 리더 모임',
      timeLabel: '10:30',
      href: '/admin/reservations/419',
      fields: [
        { label: '시간', previousValue: '20:00 ~ 21:00', value: '20:30 ~ 21:30' },
        { label: '사용 목적', previousValue: '리허설', value: '리더 모임' },
      ],
    },
    {
      id: 'item-3',
      category: 'reservation',
      status: 'success',
      action: 'cancelled',
      title: '본당 소강당 · 교육부 준비 모임',
      timeLabel: '10:30',
      href: '/admin/reservations/422',
      fields: [
        { label: '예약자', value: '조은서' },
        { label: '장소', value: '본당 소강당' },
        { label: '날짜', value: '5월 16일 (토)' },
        { label: '시간', value: '09:00 ~ 10:30' },
        { label: '사용 목적', value: '교육부 준비 모임' },
      ],
    },
    {
      id: 'item-4',
      category: 'event',
      status: 'success',
      action: 'created',
      title: '어린이주일 연합예배',
      timeLabel: '10:31',
      fields: [
        { label: '날짜', value: '5월 17일 (일)' },
        { label: '시간', value: '11:00 ~ 13:00' },
      ],
    },
    {
      id: 'item-5',
      category: 'reservation',
      status: 'failed',
      action: 'created',
      title: '1층 회의실 · 교역자 미팅',
      timeLabel: '10:31',
      href: '/admin/reservations/420',
      fields: [
        { label: '예약자', value: '박선영' },
        { label: '장소', value: '1층 회의실' },
        { label: '날짜', value: '5월 18일 (월)' },
        { label: '시간', value: '14:00 ~ 15:00' },
        { label: '사용 목적', value: '교역자 미팅' },
      ],
    },
    {
      id: 'item-6',
      category: 'reservation',
      status: 'failed',
      action: 'updated',
      title: '소예배실 · 금요 찬양팀 연습',
      timeLabel: '10:31',
      href: '/admin/reservations/421',
      fields: [
        { label: '시간', previousValue: '18:00 ~ 19:00', value: '19:00 ~ 20:00' },
        { label: '장소', previousValue: '소예배실', value: '중예배실' },
      ],
    },
  ],
  logs: [
    {
      id: 'log-1',
      level: 'warning',
      timestampLabel: '10:31',
      message:
        '예약 #420 생성에 실패했습니다. 연결된 계정의 캘린더 권한을 확인해주세요.',
    },
    {
      id: 'log-2',
      level: 'error',
      timestampLabel: '10:31',
      message:
        '예약 #421 수정에 실패했습니다. 대상 이벤트가 이미 삭제되었을 수 있습니다.',
    },
  ],
};

const meta: Meta<typeof CalendarSyncHistoryDetail> = {
  title: 'Components/Admin/CalendarSyncHistoryDetail',
  component: CalendarSyncHistoryDetail,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof CalendarSyncHistoryDetail>;

export const SummaryViewWithEvents: Story = {
  args: {
    run: baseRun,
    selectedItemFilter: 'reservation',
    initialItemViewMode: 'summary',
  },
};

export const TitleOnlyReservationView: Story = {
  args: {
    run: {
      ...baseRun,
      items: baseRun.items.filter((item) => item.category === 'reservation'),
    },
    selectedItemFilter: 'reservation',
    initialItemViewMode: 'title',
  },
};

export const FailedReservationUpdates: Story = {
  args: {
    run: {
      ...baseRun,
      items: baseRun.items.filter(
        (item) => item.status === 'failed' && item.category === 'reservation'
      ),
    },
    selectedItemFilter: 'reservation',
    initialItemViewMode: 'summary',
  },
};

export const EventIncludedFailure: Story = {
  args: {
    run: {
      status: 'failed',
      trigger: 'manual',
      startedAtLabel: '2026년 5월 11일 오전 10:30 동기화',
      durationLabel: '7초',
      summary: {
        reservationSyncStatus: 'failed',
        eventSyncStatus: 'failed',
      },
      items: [
        {
          id: 'failed-pull',
          category: 'event',
          status: 'failed',
          action: 'created',
          title: '어린이주일 연합예배',
          timeLabel: '10:30',
          fields: [
            { label: '날짜', value: '5월 17일 (일)' },
            { label: '시간', value: '11:00 ~ 13:00' },
          ],
        },
      ],
      logs: [
        {
          id: 'log-failed-1',
          level: 'error',
          timestampLabel: '10:30',
          message:
            'Google 토큰 갱신에 실패했습니다. 계정 재연동이 필요할 수 있습니다.',
        },
      ],
    },
    selectedItemFilter: 'event',
    initialItemViewMode: 'summary',
  },
};
