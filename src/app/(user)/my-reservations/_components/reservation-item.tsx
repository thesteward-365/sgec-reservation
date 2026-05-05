'use client';

import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export type MyReservation = {
  id: number;
  placeId: number;
  placeName: string | null;
  floorId: number | null;
  floorName: string | null;
  userName: string | null;
  startTime: Date | string;
  endTime: Date | string;
  purpose: string;
};

type Props = {
  reservation: MyReservation;
  showDate?: boolean;
  flat?: boolean;
  isPast?: boolean;
  onTap?: () => void;
};

function fmtTime(dt: Date | string): string {
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

  return (
    <button
      onClick={onTap}
      disabled={!onTap}
      className={cn(
        'flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors',
        flat
          ? 'rounded-none bg-transparent shadow-none'
          : 'bg-card rounded-2xl shadow-(--shadow-1)',
        isPast && 'opacity-50',
        onTap && !flat && 'hover:bg-neutral-50 active:bg-neutral-100',
        !onTap && 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[16px] leading-tight font-bold">
            {reservation.placeName ?? '–'}
            {reservation.floorName ? ` · ${reservation.floorName}` : ''}
          </p>
          <p className="text-muted-foreground mt-1 truncate text-[13px]">
            {reservation.purpose}
          </p>
        </div>
        <p className="text-muted-foreground text-[13px] tabular-nums">
          {fmtTime(start)} – {fmtTime(end)}
        </p>
      </div>

      {showDate ? (
        <p className="text-muted-foreground text-[13px] font-medium">
          {fmtDate(start)}
        </p>
      ) : null}
    </button>
  );
}
