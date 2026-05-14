'use client';

import { useState } from 'react';
import { ReservationDetailsCard } from './reservation-details-card';
import { HistoryListItem, type HistoryItem } from './history-list-item';
import { cn } from '@/lib/utils';
import { formatTime, formatKoreanDate } from '@/lib/date-utils';

export interface Reservation {
  id: number;
  placeId: number;
  placeName: string | null;
  floorId: number | null;
  floorName: string | null;
  userName: string | null;
  purpose: string;
  startTime: string | null;
  endTime: string | null;
  googleEventUrl?: string | null;
  googleSync?: {
    status: 'synced' | 'pending' | 'missing_event';
    label: string;
    lastSyncedAt: string | null;
    runId: string | null;
  } | null;
}

interface Props {
  reservation: Reservation;
  history: HistoryItem[];
  loadingHistory?: boolean;
  onTabChange?: (tab: 'info' | 'history') => void;
  googleSyncSection?: React.ReactNode;
  actions?: React.ReactNode;
}

export function ReservationDetailView({
  reservation,
  history,
  loadingHistory,
  onTabChange,
  googleSyncSection,
  actions,
}: Props) {
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  const handleTabChange = (tab: 'info' | 'history') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const detailRows = [
    { label: '장소', value: reservation.placeName ?? '–' },
    { label: '날짜', value: reservation.startTime ? formatKoreanDate(reservation.startTime) : '–' },
    { label: '시간', value: reservation.startTime && reservation.endTime ? `${formatTime(reservation.startTime)} – ${formatTime(reservation.endTime)}` : '–' },
    { label: '목적', value: reservation.purpose },
    { label: '예약자', value: reservation.userName ?? '–' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Switcher - Using bg-neutral-200 for container to contrast with grey page and white tabs */}
      <div className="flex gap-1 rounded-2xl bg-neutral-200 p-1 shadow-inner">
        <button
          onClick={() => handleTabChange('info')}
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-bold transition-all duration-200",
            activeTab === 'info' 
              ? "bg-white text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          예약 정보
        </button>
        <button
          onClick={() => handleTabChange('history')}
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-bold transition-all duration-200",
            activeTab === 'history' 
              ? "bg-white text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          변경 이력
        </button>
      </div>

      {activeTab === 'info' ? (
        <div className="space-y-8">
          <div className="space-y-3">
            <ReservationDetailsCard rows={detailRows} tone="white" />
            {googleSyncSection}
          </div>
          {actions && <div className="flex flex-col gap-3">{actions}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          {loadingHistory ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-white shadow-1" />
            ))
          ) : history.length > 0 ? (
            <div className="flex flex-col gap-3">
              {history.map((item) => (
                <HistoryListItem key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground bg-white rounded-3xl shadow-(--shadow-1)">
              변경 이력이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
