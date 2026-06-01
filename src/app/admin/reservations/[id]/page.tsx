'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeftIcon,
  ShareIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
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
import { toast } from 'sonner';
import { shareReservation } from '@/lib/share-utils';
import { formatKoreanDate, formatTime, toYMD } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface Reservation extends BaseReservation {
  isCancelled?: boolean;
  googleEventUrl?: string | null;
  googleSync?: {
    status: 'synced' | 'pending' | 'failed';
    label: string;
    lastSyncedAt: string | null;
    lastAttemptedAt: string | null;
    runId: string | null;
    errorCode: string | null;
    errorLabel: string | null;
    errorMessage: string | null;
    retryable: boolean;
  } | null;
}

export default function ReservationDetailPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ backHref?: string }>;
}) {
  const params = use(paramsPromise);
  const searchParams = use(searchParamsPromise);
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/reservations/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setReservation(data);
        } else {
          toast.error('예약 정보를 불러오는데 실패했습니다.');
          router.push('/admin/reservations');
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
      placeName: reservation.placeName || '',
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      userName: reservation.userName || '',
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
    router.replace(`/reserve/${reservation.placeId}?${paramsUrl}`);
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
      router.push('/admin/reservations');
    } catch {
      toast.error('예약 취소에 실패했어요');
    } finally {
      setCancelling(false);
    }
  };

  const handleBack = () => {
    if (searchParams.backHref) {
      router.push(searchParams.backHref);
    } else {
      router.push('/admin/reservations');
    }
  };

  const handleReReserve = () => {
    if (!reservation) return;
    router.push(`/reserve/${reservation.placeId}`);
  };

  const handleOpenGoogleEvent = () => {
    if (!reservation?.googleEventUrl) return;
    window.open(reservation.googleEventUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenSyncRun = () => {
    const runId = reservation?.googleSync?.runId;
    if (!runId) return;
    const params = new URLSearchParams({
      backHref: `/admin/reservations/${reservation?.id}`,
    });
    router.push(`/admin/calendar/history/${runId}?${params.toString()}`);
  };

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/reservations/${params.id}/sync`, {
        method: 'POST',
      });
      const syncResult = await res.json();
      if (res.ok) {
        if (syncResult.status === 'success') {
          toast.success('동기화가 완료되었습니다.');
        } else {
          toast.error('동기화에 실패했습니다.');
        }
        const refreshRes = await fetch(`/api/admin/reservations/${params.id}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setReservation(data);
        }
      } else {
        throw new Error();
      }
    } catch {
      toast.error('동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
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
      <header className="bg-neutral-150 sticky top-0 z-10 grid h-14 grid-cols-[5rem_1fr_5rem] items-center px-4">
        <div className="flex justify-start">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-lg font-bold">예약 상세</h1>
          {reservation.isCancelled && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600">
              취소됨
            </span>
          )}
        </div>
        <div className="flex justify-end gap-1">
          {!reservation.isCancelled ? (
            <button
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
            >
              <ShareIcon className="h-6 w-6" />
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 p-5 pb-32">
        <ReservationDetailView
          reservation={reservation}
          history={history}
          loadingHistory={loadingHistory}
          onTabChange={(tab) => tab === 'history' && fetchHistory()}
          googleSyncSection={
            reservation.googleSync ? (
              <div className="flex w-full flex-col overflow-hidden rounded-lg bg-white shadow-(--shadow-1) transition hover:bg-neutral-50">
                <div className="flex w-full items-center justify-between px-6 py-5 text-left disabled:cursor-default">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-sm font-medium">
                      Google 동기화
                    </p>
                    <p className="text-foreground mt-1 truncate text-sm font-semibold">
                      {reservation.googleSync.status === 'failed'
                        ? reservation.googleSync.lastAttemptedAt
                          ? `${reservation.googleSync.label} · ${formatKoreanDate(reservation.googleSync.lastAttemptedAt)} ${formatTime(reservation.googleSync.lastAttemptedAt)} 시도`
                          : reservation.googleSync.label
                        : reservation.googleSync.lastSyncedAt
                          ? `${reservation.googleSync.label} · ${formatKoreanDate(reservation.googleSync.lastSyncedAt)} ${formatTime(reservation.googleSync.lastSyncedAt)} 반영`
                          : reservation.googleSync.label}
                    </p>
                    {reservation.googleSync.errorMessage ? (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        {reservation.googleSync.errorLabel
                          ? `${reservation.googleSync.errorLabel}: `
                          : ''}
                        {reservation.googleSync.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-3">
                    {!reservation.isCancelled && (
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200 disabled:opacity-50"
                        title="지금 동기화"
                      >
                        <ArrowPathIcon
                          className={cn('h-5 w-5', syncing && 'animate-spin')}
                        />
                      </button>
                    )}
                    {!reservation.isCancelled && reservation.googleEventUrl ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGoogleEvent();
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200"
                        title="Google Calendar에서 보기"
                      >
                        <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null
          }
          actions={
            !reservation.isCancelled && (
              <div className="mt-4 flex w-full flex-col gap-3">
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  className="w-full"
                  onClick={handleReReserve}
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
                    onClick={handleEdit}
                  >
                    <PencilIcon className="h-4 w-4" />
                    예약 수정
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    className="flex-1"
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
          <div className="mt-8 rounded-lg bg-red-50 p-6 text-center">
            <p className="text-body-sm font-medium break-keep text-red-600">
              이 예약은 취소되어 상세 정보를 수정하거나 공유할 수 없습니다.
            </p>
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
            <Button
              variant="text"
              color="primary"
              onClick={() => setConfirmOpen(false)}
            >
              아니요
            </Button>
            <Button
              variant="contained"
              color="error"
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
