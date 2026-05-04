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
        'flex w-full flex-col gap-2 rounded-2xl px-4 py-4 text-left transition-colors',
        flat
          ? 'bg-(--color-neutral-150) shadow-none'
          : 'bg-card shadow-(--shadow-1)',
        isPast && 'opacity-50',
        onTap && !flat && 'hover:bg-neutral-50 active:bg-neutral-100',
        !onTap && 'cursor-default'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[16px] leading-tight font-bold">
            {reservation.placeName ?? '–'}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
            {reservation.purpose}
          </p>
        </div>
      </div>

      <div className="text-muted-foreground flex items-center gap-1.5 text-[13px] font-medium">
        {showDate && (
          <>
            <span>{fmtDate(start)}</span>
            <span className="size-1 rounded-full bg-current opacity-40" />
          </>
        )}
        <span className="tabular-nums">
          {fmtTime(start)} – {fmtTime(end)}
        </span>
      </div>
    </button>
  );
}
