'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { formatTimeAgo } from '@/lib/utils';

export type AdminReservation = {
  id: number;
  placeId: number;
  placeName: string | null;
  floorId: number | null;
  floorName: string | null;
  userName: string | null;
  purpose: string;
  startTime: string | null;
  endTime: string | null;
};

interface HistoryItem {
  id: number;
  actionType: 'created' | 'updated' | 'cancelled';
  actorUserName: string;
  changes: any;
  createdAt: number;
}

type Props = {
  reservation: AdminReservation | null;
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
};

function formatKoreanDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(iso));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toYMD(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AdminReservationSheet({
  reservation,
  open,
  onClose,
  onCancelled,
}: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  useEffect(() => {
    if (open && reservation) {
      fetchHistory();
    } else {
      setHistory([]);
      setExpandedHistoryId(null);
    }
  }, [open, reservation]);

  async function fetchHistory() {
    if (!reservation) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservation.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleConfirmCancel() {
    if (!reservation) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservation.id}`, {
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
    if (!reservation?.startTime) return;
    const date = toYMD(reservation.startTime);
    const params = new URLSearchParams({
      date,
      reservationId: String(reservation.id),
      backUrl: '/admin/reservations',
    });
    router.push(`/reserve/${reservation.placeId}?${params}`);
    onClose();
  }

  const isPast = reservation?.endTime
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
        {
          label: '날짜',
          value: reservation.startTime
            ? formatKoreanDate(reservation.startTime)
            : '–',
        },
        {
          label: '시간',
          value:
            reservation.startTime && reservation.endTime
              ? `${formatTime(reservation.startTime)} – ${formatTime(reservation.endTime)}`
              : '–',
        },
        { label: '목적', value: reservation.purpose },
        { label: '예약자', value: reservation.userName ?? '–' },
      ]
    : [];

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'created': return '생성';
      case 'updated': return '수정';
      case 'cancelled': return '취소';
      default: return '작업';
    }
  };

  const formatChangeValue = (key: string, value: any) => {
    if (key === 'startTime' || key === 'endTime') {
      try {
        return new Date(value).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return value;
      }
    }
    return value;
  };

  const renderChanges = (changes: any) => {
    return (
      <div className="mt-2 space-y-2 border-t border-neutral-100 pt-2">
        {Object.entries(changes).map(([key, value]: [string, any]) => {
          if (key === 'cancelled') return null;
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase">
                {key === 'startTime' ? '시작 시간' : key === 'endTime' ? '종료 시간' : key === 'purpose' ? '사용 목적' : key}
              </span>
              <div className="text-caption flex items-center gap-1.5">
                <span className="line-through opacity-40">{formatChangeValue(key, value.from)}</span>
                <span className="opacity-40">→</span>
                <span className="font-semibold text-blue-600">{formatChangeValue(key, value.to)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>예약 관리</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-6 overflow-y-auto px-6 pb-8">
            {reservation && (
              <ReservationDetailsCard rows={rows} tone="subtle" />
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="h-12 flex-1 rounded-xl"
                onClick={handleEdit}
              >
                예약 수정
              </Button>
              <Button
                variant="destructive"
                className="h-12 flex-1 rounded-xl"
                onClick={() => setConfirmOpen(true)}
              >
                예약 취소
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-body font-bold">변경 이력</p>
              {loadingHistory ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-neutral-100" />
                  ))}
                </div>
              ) : history.length > 0 ? (
                <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100 bg-white">
                  {history.map((item) => (
                    <div key={item.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold text-white ${
                              item.actionType === 'created' ? 'bg-green-500' :
                              item.actionType === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                            }`}>
                              {getActionLabel(item.actionType)}
                            </span>
                            <span className="text-body-sm font-medium">{item.actorUserName}</span>
                          </div>
                          <p className="text-caption text-muted-foreground mt-1">
                            {formatTimeAgo(new Date(item.createdAt))}
                          </p>
                        </div>
                        {item.actionType === 'updated' && (
                          <button
                            onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
                            className="text-caption text-accent font-medium"
                          >
                            {expandedHistoryId === item.id ? '닫기' : '상세보기'}
                          </button>
                        )}
                      </div>
                      {expandedHistoryId === item.id && item.actionType === 'updated' && renderChanges(item.changes)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-caption text-muted-foreground py-4 text-center">변경 이력이 없습니다.</p>
              )}
            </div>
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
