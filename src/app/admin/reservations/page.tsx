'use client';

import { useState } from 'react';
import { BrandHeader } from '@/components/layout/brand-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDaysIcon,
  ListBulletIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  MapPinIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface Reservation {
  id: number;
  placeName: string;
  userName: string;
  purpose: string;
  startTime: string;
  endTime: string;
  date: string;
}

const VIEW_MODES = ['캘린더', '전체 목록'] as const;
const LIST_TABS = ['예정', '지난 예약', '전체'] as const;

type ViewMode = (typeof VIEW_MODES)[number];
type ListTab = (typeof LIST_TABS)[number];

// 더미 데이터
const RESERVATIONS: Reservation[] = [
  {
    id: 1,
    placeName: '본당',
    userName: '김철수',
    purpose: '주일 예배',
    startTime: '09:00',
    endTime: '11:00',
    date: '2024-01-15',
  },
  {
    id: 2,
    placeName: '카페 공간',
    userName: '홍길동',
    purpose: '청년부 모임',
    startTime: '14:00',
    endTime: '16:00',
    date: '2024-01-15',
  },
  {
    id: 3,
    placeName: '소예배실',
    userName: '이영희',
    purpose: '기도모임',
    startTime: '19:00',
    endTime: '20:30',
    date: '2024-01-16',
  },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return '오늘';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return '내일';
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  }
}

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isPast(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function ReservationsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('전체 목록');
  const [activeTab, setActiveTab] = useState<ListTab>('예정');

  const getFilteredReservations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (activeTab) {
      case '예정':
        return RESERVATIONS.filter((r) => !isPast(r.date));
      case '지난 예약':
        return RESERVATIONS.filter((r) => isPast(r.date));
      case '전체':
      default:
        return RESERVATIONS;
    }
  };

  const groupReservationsByDate = (reservations: Reservation[]) => {
    const grouped: { [key: string]: Reservation[] } = {};
    reservations.forEach((reservation) => {
      if (!grouped[reservation.date]) {
        grouped[reservation.date] = [];
      }
      grouped[reservation.date].push(reservation);
    });
    return grouped;
  };

  const renderCalendarView = () => (
    <div className="p-5">
      <Card className="p-6 text-center">
        <CalendarDaysIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 className="text-headline2 mb-2">캘린더 뷰</h3>
        <p className="text-body-medium text-muted-foreground">
          월별 캘린더에서 예약 현황을 확인할 수 있습니다.
        </p>
        <p className="text-body-small text-muted-foreground mt-2">
          (현재는 더미 구현입니다)
        </p>
      </Card>
    </div>
  );

  const renderListView = () => {
    const filteredReservations = getFilteredReservations();
    const groupedReservations = groupReservationsByDate(filteredReservations);

    return (
      <div className="flex-1">
        {/* 탭 */}
        <div className="border-border-subtle flex border-b px-5 py-3">
          {LIST_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-body-medium mr-2 rounded-lg px-4 py-2 transition-colors ${
                activeTab === tab
                  ? 'bg-fg-strong text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 예약 목록 */}
        <div className="p-5">
          {Object.keys(groupedReservations).length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-body-medium text-muted-foreground">
                {activeTab === '예정'
                  ? '예정된 예약이 없습니다'
                  : activeTab === '지난 예약'
                    ? '지난 예약이 없습니다'
                    : '예약이 없습니다'}
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedReservations)
                .sort(
                  ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
                )
                .map(([date, reservations]) => (
                  <div key={date}>
                    {/* 날짜 헤더 */}
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-headline2">{formatDate(date)}</h3>
                      {isToday(date) && <Badge variant="solid" color="blue">오늘</Badge>}
                    </div>

                    {/* 예약 목록 */}
                    <div className="space-y-3">
                      {reservations.map((reservation) => (
                        <Card key={reservation.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex items-center gap-2">
                                <MapPinIcon className="text-muted-foreground h-4 w-4" />
                                <span className="text-body-medium font-semibold">
                                  {reservation.placeName}
                                </span>
                              </div>
                              <div className="text-body-small text-muted-foreground flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="h-3 w-3" />
                                  <span>
                                    {reservation.startTime} -{' '}
                                    {reservation.endTime}
                                  </span>
                                </div>
                                <span>{reservation.userName}</span>
                              </div>
                              <p className="text-body-small text-muted-foreground mt-1">
                                {reservation.purpose}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-24">
        {/* 헤더 */}
        <div className="border-border-subtle flex items-center justify-between border-b px-5 py-4">
          <h1 className="text-headline2">예약 관리</h1>
          <Button variant="secondary" size="sm">
            <FunnelIcon className="mr-1 h-4 w-4" />
            필터
          </Button>
        </div>

        {/* 뷰 모드 전환 */}
        <div className="border-border-subtle flex border-b px-5 py-3">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-body-medium mr-2 flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
                viewMode === mode
                  ? 'bg-fg-strong text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === '캘린더' ? (
                <CalendarDaysIcon className="h-4 w-4" />
              ) : (
                <ListBulletIcon className="h-4 w-4" />
              )}
              {mode}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        {viewMode === '캘린더' ? renderCalendarView() : renderListView()}
      </main>
    </>
  );
}
