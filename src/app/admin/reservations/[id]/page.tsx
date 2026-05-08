'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeftIcon,
  ShareIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { 
  ReservationDetailView, 
  type Reservation as BaseReservation, 
} from '@/components/reservations/reservation-detail-view';
import { type HistoryItem } from '@/components/reservations/history-list-item';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { shareReservation } from '@/lib/share-utils';
import { formatKoreanDate, formatTime, toYMD } from '@/lib/date-utils';

interface Reservation extends BaseReservation {
  isCancelled?: boolean;
}

export default function ReservationDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/reservations/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setReservation(data);
        } else {
          toast.error('예약 정보를 불러오는데 실패했습니다.');
          router.back();
        }
      } catch (error) {
        console.error('Failed to fetch reservation:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, router]);

  const fetchHistory = async () => {
    if (history.length > 0) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/reservations/${params.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShare = async () => {
    if (!reservation || !reservation.startTime || !reservation.endTime) return;
    await shareReservation({
      placeName: reservation.placeName,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      userName: reservation.userName,
      purpose: reservation.purpose,
    });
  };

  const handleEdit = () => {
    if (!reservation?.startTime) return;
    const date = toYMD(reservation.startTime);
    const paramsUrl = new URLSearchParams({
      date,
      reservationId: String(reservation.id),
      backUrl: `/admin/reservations/${reservation.id}`,
    });
    router.push(`/reserve/${reservation.placeId}?${paramsUrl}`);
  };

  const handleConfirmCancel = async () => {
    if (!reservation) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      setConfirmOpen(false);
      toast.success('예약을 취소했어요');
      router.back();
    } catch {
      toast.error('예약 취소에 실패했어요');
    } finally {
      setCancelling(false);
    }
  };

  const handleReReserve = () => {
    if (!reservation) return;
    router.push(`/reserve/${reservation.placeId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-150">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!reservation) return null;

  return (
    <div className="flex flex-col min-h-screen bg-neutral-150">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-neutral-150 px-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">예약 상세</h1>
          {reservation.isCancelled && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">취소됨</Badge>
          )}
        </div>
        {!reservation.isCancelled ? (
          <button
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
          >
            <ShareIcon className="h-6 w-6" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      <main className="flex-1 p-5 pb-32">
        <ReservationDetailView
          reservation={reservation}
          history={history}
          loadingHistory={loadingHistory}
          onTabChange={(tab) => tab === 'history' && fetchHistory()}
          actions={
            !reservation.isCancelled && (
              <div className="flex flex-col w-full gap-3 mt-4">
                <Button
                  className="w-full h-14 bg-(--color-fg-strong) text-white shadow-(--shadow-1)"
                  onClick={handleReReserve}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  동일 장소 예약하기
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 h-12"
                    onClick={handleEdit}
                  >
                    <PencilIcon className="h-4 w-4" />
                    예약 수정
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 h-12 text-red-500"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <TrashIcon className="h-4 w-4" />
                    예약 취소
                  </Button>
                </div>
              </div>
            )
          }
        />
        {reservation.isCancelled && (
          <div className="mt-8 rounded-2xl bg-red-50 p-6 text-center">
            <p className="text-body-sm font-medium text-red-600 break-keep">이 예약은 취소되어 상세 정보를 수정하거나 공유할 수 없습니다.</p>
          </div>
        )}
      </main>

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
    </div>
  );
}
