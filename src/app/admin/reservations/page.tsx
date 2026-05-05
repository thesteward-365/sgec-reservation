'use client';

import { useEffect, useState } from 'react';
import { BrandHeader } from '@/components/layout/brand-header';

interface Reservation {
  id: number;
  userId: number;
  userName: string | null;
  placeId: number;
  placeName: string | null;
  purpose: string;
  startTime: string | null;
  endTime: string | null;
}

type ListTab = '예정' | '지난 예약' | '전체';

const CHIP_BASE =
  'inline-flex items-center font-medium leading-none rounded-pill px-3 py-[6px] text-caption transition-colors duration-120 cursor-pointer select-none whitespace-nowrap';
const CHIP_ACTIVE = 'bg-(--color-fg-strong) text-white';
const CHIP_INACTIVE = 'bg-neutral-300 text-foreground';

function formatDateHeader(isoString: string): string {
  const d = new Date(isoString);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (dStr === todayStr) return '오늘';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tmrStr = `${tomorrow.getFullYear()}-${tomorrow.getMonth()}-${tomorrow.getDate()}`;
  if (dStr === tmrStr) return '내일';
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getDateKey(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isPast(isoString: string): boolean {
  const d = new Date(isoString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState<ListTab>('예정');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reservations')
      .then((r) => r.json())
      .then((data: Reservation[]) => setReservations(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = reservations.filter((r) => {
    if (!r.startTime) return activeTab === '전체';
    if (activeTab === '예정') return !isPast(r.startTime);
    if (activeTab === '지난 예약') return isPast(r.startTime);
    return true;
  });

  const grouped: Record<string, Reservation[]> = {};
  for (const r of filtered) {
    const key = r.startTime ? getDateKey(r.startTime) : '날짜 없음';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }
  const sortedDates = Object.keys(grouped).sort();

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-24">
        {/* 탭 */}
        <div className="flex gap-1.5 px-5 py-4">
          {(['예정', '지난 예약', '전체'] as ListTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${CHIP_BASE} ${activeTab === tab ? CHIP_ACTIVE : CHIP_INACTIVE}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 예약 목록 */}
        <div className="px-5 pb-5">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <div key={j} className="bg-card animate-pulse rounded-2xl p-4">
                        <div className="space-y-2">
                          <div className="bg-muted h-5 w-32 rounded" />
                          <div className="bg-muted h-4 w-48 rounded" />
                          <div className="bg-muted h-3 w-40 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center">
              <span className="block text-body text-muted-foreground">
                {activeTab === '예정'
                  ? '예정된 예약이 없습니다'
                  : activeTab === '지난 예약'
                    ? '지난 예약이 없습니다'
                    : '예약이 없습니다'}
              </span>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((dateKey) => (
                <div key={dateKey}>
                  {/* 날짜 헤더 */}
                  <div className="mb-2 px-1">
                    <span className="text-body-sm font-semibold text-foreground">
                      {grouped[dateKey][0].startTime
                        ? formatDateHeader(grouped[dateKey][0].startTime)
                        : dateKey}
                    </span>
                  </div>

                  {/* 해당 날짜 예약 카드들 */}
                  <div className="space-y-2">
                    {grouped[dateKey].map((r) => (
                      <div key={r.id} className="bg-card rounded-2xl px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="block text-body font-bold text-foreground">
                              {r.placeName ?? '장소 없음'}
                            </span>
                            <span className="block text-body-sm text-foreground">
                              {r.startTime && r.endTime
                                ? `${formatTime(r.startTime)} – ${formatTime(r.endTime)}`
                                : '-'}
                              {' · '}
                              {r.userName ?? '알 수 없음'}
                            </span>
                            <span className="block text-caption text-muted-foreground">
                              {r.purpose}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
