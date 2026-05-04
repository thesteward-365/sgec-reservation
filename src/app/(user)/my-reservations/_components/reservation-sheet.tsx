'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ReservationDetailsCard } from '@/components/reservations/reservation-details-card';
import type { MyReservation } from './reservation-item';

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTime(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return fmtMin(d.getHours() * 60 + d.getMinutes());
}

function formatKoreanDate(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(d);
}

function toYMD(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Props = {
  reservation: MyReservation | null;
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
};

export function ReservationSheet({ reservation, open, onClose, onCancelled }: Props) {
  const router = useRouter();

  async function handleCancel() {
    if (!reservation) return;
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onClose();
      onCancelled();
      toast.success('예약을 취소했어요');
    } catch {
      toast.error('예약 취소에 실패했어요');
    }
  }

  function handleEdit() {
    if (!reservation) return;
    const date = toYMD(reservation.startTime);
    router.push(`/reserve/${reservation.placeId}?date=${date}&reservationId=${reservation.id}`);
  }

  const isPast = reservation ? new Date(reservation.endTime) < new Date() : false;

  const rows = reservation
    ? [
        {
          label: '장소',
          value: reservation.floorName
            ? `${reservation.placeName ?? '–'} · ${reservation.floorName}`
            : (reservation.placeName ?? '–'),
        },
        { label: '날짜', value: formatKoreanDate(reservation.startTime) },
        {
          label: '시간',
          value: `${formatTime(reservation.startTime)} – ${formatTime(reservation.endTime)}`,
        },
        { label: '목적', value: reservation.purpose },
        { label: '예약자', value: reservation.userName ?? '–' },
      ]
    : [];

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>예약 관리</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-6 pb-8">
          {reservation && <ReservationDetailsCard rows={rows} />}

          <div className="flex flex-col gap-3 pt-1">
            {!isPast && (
              <Button variant="secondary" className="h-12 w-full rounded-2xl" onClick={handleEdit}>
                예약 수정
              </Button>
            )}
            <Button
              variant="destructive"
              className="h-12 w-full rounded-2xl"
              onClick={handleCancel}
            >
              예약 취소
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
