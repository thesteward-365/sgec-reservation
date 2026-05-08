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
  type Reservation,
} from '@/components/reservations/reservation-detail-view';
import { type HistoryItem } from '@/components/reservations/history-list-item';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

function formatKoreanDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(iso));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toYMD(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    const text = `[예약 정보]\n장소: ${reservation.placeName}\n날짜: ${formatKoreanDate(reservation.startTime)}\n시간: ${formatTime(reservation.startTime)} ~ ${formatTime(reservation.endTime)}\n예약자: ${reservation.userName}\n목적: ${reservation.purpose}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: '예약 정보 공유',
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('예약 정보가 클립보드에 복사되었습니다.');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text);
          toast.success('예약 정보가 클립보드에 복사되었습니다.');
        } catch {
          toast.error('정보 공유에 실패했습니다.');
        }
      }
    }
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
      <div className="bg-neutral-150 flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!reservation) return null;

  return (
    <div className="bg-neutral-150 flex min-h-screen flex-col">
      <header className="bg-neutral-150 sticky top-0 z-10 flex h-14 items-center justify-between px-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">예약 상세</h1>
        <button
          onClick={handleShare}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
        >
          <ShareIcon className="h-6 w-6" />
        </button>
      </header>

      <main className="flex-1 p-5 pb-32">
        <ReservationDetailView
          reservation={reservation}
          history={history}
          loadingHistory={loadingHistory}
          onTabChange={(tab) => tab === 'history' && fetchHistory()}
          actions={
            <div className="mt-4 flex w-full flex-col gap-3">
              <Button className="h-14 w-full" onClick={handleReReserve}>
                <ArrowPathIcon className="h-5 w-5" />
                동일 장소 예약하기
              </Button>

              <Button
                variant="secondary"
                className="h-14 flex-1"
                onClick={handleEdit}
              >
                <PencilIcon className="h-4 w-4" />
                예약 수정
              </Button>

              <Button
                variant="ghost"
                className="h-14 flex-1 text-red-600"
                onClick={() => setConfirmOpen(true)}
              >
                <TrashIcon className="h-4 w-4 text-red-600" />
                예약 취소
              </Button>
            </div>
          }
        />
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
