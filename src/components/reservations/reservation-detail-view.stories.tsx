import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

import {
  ReservationDetailView,
  type Reservation,
} from './reservation-detail-view';
import type { HistoryItem } from './history-list-item';
import { Button } from '@/components/ui/button';
import { formatKoreanDate, formatTime } from '@/lib/date-utils';

const failedReservation: Reservation = {
  id: 421,
  placeId: 3,
  placeName: '소예배실',
  floorId: 1,
  floorName: '1층',
  userName: '박선영',
  purpose: '금요 찬양팀 연습',
  startTime: '2026-06-05T10:00:00.000Z',
  endTime: '2026-06-05T12:00:00.000Z',
  googleEventUrl: null,
  googleSync: {
    status: 'failed',
    label: '동기화 실패',
    lastSyncedAt: '2026-06-01T01:30:00.000Z',
    lastAttemptedAt: '2026-06-01T02:14:00.000Z',
    runId: 'sync_failed_story',
    errorCode: 'permission_denied',
    errorLabel: '권한 오류',
    errorMessage:
      '연결된 Google 계정에 캘린더 수정 권한이 없습니다. 캘린더 권한을 확인해주세요.',
    retryable: false,
  },
};

const history: HistoryItem[] = [
  {
    id: 1,
    reservationId: failedReservation.id,
    actionType: 'updated',
    actorUserName: '관리자',
    createdAt: new Date('2026-06-01T02:10:00.000Z'),
    changes: JSON.stringify({
      startTime: {
        from: '2026-06-05T09:00:00.000Z',
        to: failedReservation.startTime,
      },
      endTime: {
        from: '2026-06-05T11:00:00.000Z',
        to: failedReservation.endTime,
      },
    }),
    placeName: failedReservation.placeName,
  },
];

function GoogleSyncFailureSection({
  reservation,
}: {
  reservation: Reservation;
}) {
  const sync = reservation.googleSync;
  if (!sync) return null;

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-(--shadow-1) transition hover:bg-neutral-50">
      <div className="flex w-full items-center justify-between px-6 py-5 text-left disabled:cursor-default">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm font-medium">
            Google 동기화
          </p>
          <p className="text-foreground mt-1 truncate text-sm font-semibold">
            {sync.lastAttemptedAt
              ? `${sync.label} · ${formatKoreanDate(sync.lastAttemptedAt)} ${formatTime(sync.lastAttemptedAt)} 시도`
              : sync.label}
          </p>
          {sync.errorMessage ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {sync.errorLabel ? `${sync.errorLabel}: ` : ''}
              {sync.errorMessage}
            </p>
          ) : null}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200"
            title="지금 동기화"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 opacity-40"
            disabled
            title="Google Calendar에서 보기"
          >
            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof ReservationDetailView> = {
  title: 'Components/Reservations/ReservationDetailView',
  component: ReservationDetailView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="bg-neutral-150 min-h-dvh p-5">
        <div className="mx-auto max-w-107.5">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReservationDetailView>;

export const GoogleSyncFailed: Story = {
  args: {
    reservation: failedReservation,
    history,
    googleSyncSection: (
      <GoogleSyncFailureSection reservation={failedReservation} />
    ),
    actions: (
      <div className="mt-4 flex w-full flex-col gap-3">
        <Button
          variant="contained"
          color="secondary"
          size="large"
          className="w-full"
        >
          <ArrowPathIcon className="h-5 w-5" />
          동일 장소 예약하기
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            className="flex-1"
          >
            예약 수정
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="large"
            className="flex-1"
          >
            예약 취소
          </Button>
        </div>
      </div>
    ),
  },
};
