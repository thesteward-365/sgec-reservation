'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShareIcon } from '@heroicons/react/24/outline';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReservationDetailsCard } from '@/components/reservations/reservation-details-card';
import { shareReservation } from '@/lib/share-utils';
import { formatKoreanDate, formatTime, toYMD } from '@/lib/date-utils';
import type { MyReservation } from './reservation-item';
import { SessionData } from '@/lib/session';

type Props = {
  reservation: MyReservation | null;
  user: SessionData['user'];
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
};

export function ReservationSheet({
  reservation,
  user,
  open,
  onClose,
  onCancelled,
}: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isCancelled = useMemo(
    () => reservation?.status === 'cancelled',
    [reservation?.status]
  );

  const canManage = useMemo(() => {
    if (!reservation || !user) return false;
    return user.role === 'admin' || user.id === reservation.userId;
  }, [reservation, user]);

  async function handleConfirmCancel() {
    if (!reservation) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      setConfirmOpen(false);
      onClose();
      onCancelled();
      toast.success('예약을 취소했어요');
    } catch {
      toast.error('예약 취소에 실패했어요');
    } finally {
      setCancelling(false);
    }
  }

  function handleEdit() {
    if (!reservation) return;
    const date = toYMD(reservation.startTime);
    router.push(
      `/reserve/${reservation.placeId}?date=${date}&reservationId=${reservation.id}`
    );
  }

  const handleShare = async () => {
    if (!reservation) return;
    await shareReservation({
      placeName: reservation.floorName
        ? `${reservation.placeName ?? '–'} · ${reservation.floorName}`
        : (reservation.placeName ?? '–'),
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      userName: reservation.userName ?? '–',
      purpose: reservation.purpose,
    });
  };

  const isPast = reservation
    ? new Date(reservation.endTime) < new Date()
    : false;

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
    <>
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent>
          <DrawerHeader className="relative">
            <DrawerTitle>예약 정보</DrawerTitle>
            <button
              onClick={handleShare}
              className="absolute top-1/2 right-6 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
              title="공유하기"
              disabled={isCancelled || isPast}
            >
              <ShareIcon
                className="h-4 w-4"
                color={isCancelled ? 'grey' : ''}
              />
            </button>
          </DrawerHeader>

          <div className="flex flex-col gap-4 px-6 pb-8">
            {reservation && (
              <ReservationDetailsCard rows={rows} tone="surface" />
            )}

            {canManage && (
              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  className="h-12 flex-1 rounded-2xl"
                  onClick={handleEdit}
                  disabled={isPast}
                  title={
                    isPast ? '이미 지난 예약은 수정할 수 없습니다.' : undefined
                  }
                >
                  예약 수정
                </Button>
                <Button
                  variant="destructive"
                  disabled={isPast || cancelling || isCancelled}
                  className="h-12 flex-1 rounded-2xl"
                  onClick={() => setConfirmOpen(true)}
                >
                  예약 취소
                </Button>
              </div>
            )}
            {isPast ? (
              <p className="text-caption! text-muted-foreground!">
                이미 지난 예약입니다.
              </p>
            ) : isCancelled ? (
              <p className="text-caption! text-muted-foreground!">
                이미 취소된 예약입니다.
              </p>
            ) : (
              <></>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약을 취소할까요?</DialogTitle>
          </DialogHeader>
          <span className="text-body-sm text-muted-foreground block">
            취소된 예약은 복구할 수 없습니다.
          </span>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              아니요
            </Button>
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={handleConfirmCancel}
            >
              {cancelling ? '취소 중…' : '예약 취소'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
