'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { BrandHeader } from '@/components/layout/brand-header';
import { MonthlyCalendar } from '@/components/calendar/monthly-calendar';
import { ReservationItem, type MyReservation } from './reservation-item';
import { ReservationSheet } from './reservation-sheet';
import {
  FilterSheet,
  type FilterState,
} from '@/components/reservations/filter-sheet';
import { SessionData } from '@/lib/session';

type PlaceTagMap = Record<number, number[]>; // placeId -> tagId[]

function toYMD(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date | string, b: Date): boolean {
  const da = typeof a === 'string' ? new Date(a) : a;
  return (
    da.getFullYear() === b.getFullYear() &&
    da.getMonth() === b.getMonth() &&
    da.getDate() === b.getDate()
  );
}

function formatGroupHeader(ymd: string): string {
  const [y, mo, d] = ymd.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function isToday(ymd: string): boolean {
  return ymd === toYMD(new Date());
}

type Props = {
  user: SessionData['user'];
};

export function MyReservationsView({ user }: Props) {
  const [tab, setTab] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [allReservations, setAllReservations] = useState<MyReservation[]>([]);
  const [placeTagMap, setPlaceTagMap] = useState<PlaceTagMap>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({
    floorId: null,
    tagId: null,
    sortOrder: 'asc',
    includeCancelled: false,
    onlyMine: false,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [activeRes, setActiveRes] = useState<MyReservation | null>(null);
  const [now] = useState(() => new Date());

  // 마운트 시 전체 예약 + 장소 태그 맵 로드
  useEffect(() => {
    Promise.all([
      fetch('/api/my-reservations').then((r) => r.json()),
      fetch('/api/places').then((r) => r.json()),
    ])
      .then(([reservations, places]) => {
        const raws = (reservations as MyReservation[]).map((r) => ({
          ...r,
          startTime: new Date(r.startTime),
          endTime: new Date(r.endTime),
        }));
        setAllReservations(raws);
        const map: PlaceTagMap = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (places as any[]).forEach((p) => {
          map[p.id] = (p.tags ?? []).map((t: { id: number }) => t.id);
        });
        setPlaceTagMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  // 예약 취소 후 목록 새로고침
  function handleCancelled() {
    fetch('/api/my-reservations')
      .then((r) => r.json())
      .then((reservations) => {
        setAllReservations(
          (reservations as MyReservation[]).map((r) => ({
            ...r,
            startTime: new Date(r.startTime),
            endTime: new Date(r.endTime),
          }))
        );
      });
  }

  const filtered = useMemo(() => {
    let list = allReservations;
    if (filter.floorId !== null) {
      list = list.filter((r) => r.floorId === filter.floorId);
    }
    if (filter.tagId !== null) {
      list = list.filter((r) =>
        (placeTagMap[r.placeId] ?? []).includes(filter.tagId!)
      );
    }

    if (!filter.includeCancelled) {
      list = list.filter((reservation) => reservation.status !== 'cancelled');
    }

    if (filter.onlyMine) {
      list = list.filter((r) => r.userId === user.id);
    }

    return [...list].sort((a, b) => {
      const ta = new Date(a.startTime).getTime();
      const tb = new Date(b.startTime).getTime();
      return filter.sortOrder === 'asc' ? ta - tb : tb - ta;
    });
  }, [allReservations, filter, placeTagMap, user.id]);

  // 캘린더 인디케이터용 날짜 Set
  const indicatorDates = useMemo(
    () => new Set(filtered.map((r) => toYMD(r.startTime))),
    [filtered]
  );

  // 선택 날짜의 예약 목록
  const dailyList = useMemo(
    () => filtered.filter((r) => isSameDay(r.startTime, selectedDate)),
    [filtered, selectedDate]
  );

  // 전체 목록: 날짜별 그룹
  const grouped = useMemo(() => {
    const map = new Map<string, MyReservation[]>();
    for (const r of filtered) {
      const ymd = toYMD(r.startTime);
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const isFilterActive =
    filter.floorId !== null ||
    filter.tagId !== null ||
    filter.sortOrder !== 'asc' ||
    filter.onlyMine;

  return (
    <>
      <BrandHeader />
      <div className="flex items-end justify-between px-5 pt-1 pb-4">
        <h2 className="text-h2 text-foreground font-bold">예약 현황</h2>
        <button
          onClick={() => setShowFilter(true)}
          className="relative flex size-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
          aria-label="필터"
        >
          <AdjustmentsHorizontalIcon className="text-foreground size-5" />
          {isFilterActive && (
            <span className="bg-primary absolute top-1 right-1 size-2 rounded-full" />
          )}
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 px-5 pb-4">
        {(['calendar', 'list'] as const).map((t) => (
          <Chip
            key={t}
            size="md"
            variant={tab === t ? 'active' : 'inactive'}
            onClick={() => setTab(t)}
          >
            {t === 'calendar' ? '캘린더' : '전체 목록'}
          </Chip>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex flex-col gap-4 px-5 pb-10">
        {loading ? (
          <ListSkeleton count={3} />
        ) : tab === 'calendar' ? (
          <>
            {/* 월 달력 카드 */}
            <div className="bg-card rounded-2xl px-4 py-4 shadow-(--shadow-1)">
              <MonthlyCalendar
                selectedDate={selectedDate}
                viewMonth={viewMonth}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                onChangeMonth={setViewMonth}
                indicators={indicatorDates}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-foreground text-[16px]! font-bold">
                  {selectedDate.toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </h3>
              </div>
              <span className="text-muted-foreground text-[14px]!">
                {dailyList.length}건
              </span>
            </div>

            {dailyList.length === 0 ? (
              <div className="bg-card flex flex-col items-center gap-1.5 rounded-2xl px-4 py-10 shadow-(--shadow-1)">
                <p className="text-foreground text-[15px] font-semibold">
                  예약이 없는 날이에요
                </p>
              </div>
            ) : (
              <List className="rounded-xl">
                {dailyList.map((r) => (
                  <ListItem key={r.id} className="px-0 py-0">
                    <ReservationItem
                      reservation={r}
                      isPast={new Date(r.endTime) < now}
                      isMine={r.userId === user.id}
                      onTap={() => setActiveRes(r)}
                      flat
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        ) : /* 전체 목록 뷰 */ grouped.length === 0 ? (
          <List emptyMessage="예약 내역이 없어요" />
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map(([ymd, items]) => (
              <div key={ymd} className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-5">
                  <div>
                    <h3 className="text-foreground text-[15px]! font-bold">
                      {formatGroupHeader(ymd)}
                    </h3>
                  </div>
                  <span className="text-muted-foreground text-[13px]">
                    {items.length}건
                  </span>
                </div>
                <List>
                  {items.map((r) => (
                    <ListItem key={r.id} className="px-0 py-0">
                      <ReservationItem
                        reservation={r}
                        isPast={new Date(r.endTime) < now}
                        isMine={r.userId === user.id}
                        onTap={() => setActiveRes(r)}
                        flat
                      />
                    </ListItem>
                  ))}
                </List>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 예약 관리 바텀시트 */}
      <ReservationSheet
        reservation={activeRes}
        user={user}
        open={!!activeRes}
        onClose={() => setActiveRes(null)}
        onCancelled={handleCancelled}
      />

      {/* 필터 바텀시트 */}
      <FilterSheet
        open={showFilter}
        onClose={() => setShowFilter(false)}
        current={filter}
        onApply={(f) => setFilter(f)}
      />
    </>
  );
}
