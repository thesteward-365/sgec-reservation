'use client';

import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Chip } from '@/components/ui/chip';

export type ReservationStatus = 'active' | 'cancelled';
export type MyReservation = {
  id: number;
  userId: number;
  placeId: number;
  placeName: string | null;
  floorId: number | null;
  floorName: string | null;
  userName: string | null;
  startTime: Date | string;
  endTime: Date | string;
  purpose: string;
  status: ReservationStatus;
};

type Props = {
  reservation: MyReservation;
  showDate?: boolean;
  flat?: boolean;
  isPast?: boolean;
  isMine?: boolean;
  onTap?: () => void;
};

function formatTime(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return d.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function ReservationItem({
  reservation,
  showDate,
  flat,
  isPast,
  isMine,
  onTap,
}: Props) {
  const start =
    typeof reservation.startTime === 'string'
      ? new Date(reservation.startTime)
      : reservation.startTime;
  const end =
    typeof reservation.endTime === 'string'
      ? new Date(reservation.endTime)
      : reservation.endTime;
  const isCanceled = reservation.status === 'cancelled';
  return (
    <button
      onClick={onTap}
      disabled={!onTap}
      className={cn(
        'flex w-full items-center gap-4 px-4 py-4 text-left transition-colors',
        flat
          ? 'rounded-none bg-transparent shadow-none'
          : 'bg-card rounded-2xl shadow-(--shadow-1)',
        (isPast || isCanceled) && 'opacity-50',
        onTap && !flat && 'hover:bg-neutral-50 active:bg-neutral-100',
        !onTap && 'cursor-default'
      )}
    >
      <div className="flex min-w-[72px] flex-col items-center justify-center rounded-lg bg-neutral-50 px-3 py-2 text-center">
        <span className="text-foreground text-[18px] font-bold tabular-nums">
          {formatTime(start)}
        </span>
        <span className="text-muted-foreground mt-1 text-[12px] tabular-nums">
          {formatTime(end)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="text-foreground truncate text-[16px] font-bold!">
            {reservation.placeName
              ? `${reservation.floorName} ${reservation.placeName}`
              : '장소 없음'}
          </p>
          {reservation.status === 'cancelled' && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600">
              취소됨
            </span>
          )}
        </div>
        <p className="text-muted-foreground! mt-2 text-[14px]! leading-snug">
          {reservation.userName && (
            <span
              className={cn(
                isMine ? 'text-primary font-bold' : 'text-muted-foreground'
              )}
            >
              {reservation.userName}
            </span>
          )}
          {reservation.userName ? ' · ' : ''}
          {reservation.purpose}
        </p>
      </div>
    </button>
  );
}
