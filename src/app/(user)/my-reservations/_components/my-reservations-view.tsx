'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { BrandHeader } from '@/components/layout/brand-header';
import {
  MonthlyCalendar,
  type CalendarEvent,
} from '@/components/calendar/monthly-calendar';
import { ReservationItem, type MyReservation } from './reservation-item';
import { ReservationListView } from './reservation-list-view';
import { ReservationSheet } from './reservation-sheet';
import {
  FilterSheet,
  type FilterState,
} from '@/components/reservations/filter-sheet';
import {
  ExternalEventsSheet,
  type ExternalEventSheetItem,
} from '@/components/reservations/external-events-sheet';
import { SessionData } from '@/lib/session';
import { compareReservationByDayAndTime } from '@/lib/services/reservation-sorting';
import { getExternalEventDateRange } from '@/lib/external-event-dates';

type PlaceTagMap = Record<number, number[]>; // placeId -> tagId[]

type ExternalEventResponse = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  description: string | null;
};

type ExternalCalendarEvent = CalendarEvent & {
  raw: ExternalEventResponse;
};

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
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>(
    []
  );
  const [placeTagMap, setPlaceTagMap] = useState<PlaceTagMap>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({
    floorId: null,
    tagId: null,
    sortOrder: 'desc',
    includeCancelled: false,
    onlyMine: false,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [activeRes, setActiveRes] = useState<MyReservation | null>(null);
  const [activeExternalEvents, setActiveExternalEvents] = useState<{
    dateLabel: string;
    events: ExternalEventSheetItem[];
  } | null>(null);
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

  const viewMonthKey = useMemo(() => {
    return `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [viewMonth]);

  // 외부 행사 로딩 (월별)
  useEffect(() => {
    fetch(`/api/external-events?month=${viewMonthKey}`)
      .then((r) => r.json())
      .then((data: ExternalEventResponse[]) => {
        setExternalEvents(
          (data || []).map((ev) => {
            const { startDate, endDate } = getExternalEventDateRange(ev);
            return {
              id: ev.id,
              title: ev.title,
              startDate,
              endDate,
              variant: 'accent', // 기본 테마색
              raw: ev,
            };
          })
        );
      })
      .catch(console.error);
  }, [viewMonthKey]);

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

    if (filter.onlyMine && user?.id) {
      list = list.filter((r) => r.userId === user.id);
    }

    return [...list].sort((a, b) => {
      return compareReservationByDayAndTime(a, b, filter.sortOrder);
    });
  }, [allReservations, filter, placeTagMap, user]);

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

  const dailyEvents = useMemo(() => {
    const ymd = toYMD(selectedDate);
    return externalEvents.filter(
      (ev) => ymd >= ev.startDate && ymd <= ev.endDate
    );
  }, [externalEvents, selectedDate]);

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

  function getExternalEventsForDate(ymd: string): ExternalEventSheetItem[] {
    return externalEvents
      .filter((event) => ymd >= event.startDate && ymd <= event.endDate)
      .map((event) => ({
        id: event.id,
        title: event.title,
        startTime: event.raw.startTime,
        endTime: event.raw.endTime,
        description: event.raw.description,
        isAllDay: event.raw.isAllDay,
      }));
  }

  const selectedDateKey = toYMD(selectedDate);
  const selectedDateLabel = selectedDate.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const selectedDateEvents = getExternalEventsForDate(selectedDateKey);

  const isFilterActive =
    filter.floorId !== null || filter.tagId !== null || filter.onlyMine;

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
      <div className="flex items-center justify-between px-5 pb-4">
        <div className="flex gap-2">
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

        {tab === 'list' && (
          <select
            value={filter.sortOrder}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                sortOrder: e.target.value as 'asc' | 'desc',
              }))
            }
            className="text-foreground cursor-pointer bg-transparent text-[14px] font-medium outline-none"
          >
            <option value="desc">최신순</option>
            <option value="asc">오래된순</option>
          </select>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="flex flex-col gap-4 px-5 pb-10">
        {loading ? (
          <ListSkeleton count={3} />
        ) : tab === 'calendar' ? (
          <>
            {/* 월 달력 카드 */}
            <div className="bg-card rounded-xl p-5 shadow-(--shadow-1)">
              <MonthlyCalendar
                selectedDate={selectedDate}
                viewMonth={viewMonth}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  const nextMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                  if (nextMonth.getTime() !== viewMonth.getTime()) {
                    setViewMonth(nextMonth);
                  }
                }}
                onChangeMonth={setViewMonth}
                indicators={indicatorDates}
                events={externalEvents}
                showEvents={false}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h3 className="text-foreground shrink-0 text-[16px]! font-bold">
                  {selectedDateLabel}
                </h3>

                {selectedDateEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveExternalEvents({
                        dateLabel: selectedDateLabel,
                        events: selectedDateEvents,
                      })
                    }
                    className="min-w-0 rounded-full transition-opacity hover:opacity-80"
                  >
                    <Badge
                      color="violet"
                      className="flex max-w-full items-center gap-1 border-none px-2 py-0.5 text-[12px]! font-bold"
                    >
                      <span className="truncate">
                        {selectedDateEvents[0].title}
                      </span>
                      {selectedDateEvents.length > 1 && (
                        <span className="shrink-0">
                          외 {selectedDateEvents.length - 1}건
                        </span>
                      )}
                    </Badge>
                  </button>
                )}
              </div>
              <span className="text-muted-foreground shrink-0 text-[14px]!">
                {dailyList.length}건
              </span>
            </div>

            <div className="bg-card overflow-hidden rounded-xl shadow-(--shadow-1)">
              {dailyList.length === 0 ? (
                <div className="bg-card flex flex-col items-center gap-1.5 rounded-lg px-4 py-10">
                  <p className="text-foreground text-[15px] font-semibold">
                    {dailyEvents.length === 0
                      ? '예약이 없는 날이에요'
                      : '예약 내역이 없어요'}
                  </p>
                </div>
              ) : (
                <List className="divide-border/50 divide-y rounded-none">
                  {dailyList.map((r) => (
                    <ListItem key={r.id} className="px-0 py-0">
                      <ReservationItem
                        reservation={r}
                        isPast={new Date(r.endTime) < now}
                        isMine={r.userId === user?.id}
                        onTap={() => setActiveRes(r)}
                        flat
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </div>
          </>
        ) : (
          <ReservationListView
            user={user}
            filter={filter}
            placeTagMap={placeTagMap}
            onSelectReservation={(r) => setActiveRes(r)}
            now={now}
          />
        )}
      </div>

      <Link
        href={`/reserve?date=${toYMD(selectedDate)}`}
        className="fixed right-5 bottom-24 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--color-fg-strong) text-white shadow-[0_10px_20px_rgba(0,0,0,0.16)] transition hover:bg-(--color-fg-strong)/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        aria-label="예약하기"
      >
        <PlusIcon className="h-6 w-6" aria-hidden="true" />
      </Link>

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

      <ExternalEventsSheet
        open={!!activeExternalEvents}
        onOpenChange={(open) => {
          if (!open) setActiveExternalEvents(null);
        }}
        dateLabel={activeExternalEvents?.dateLabel ?? ''}
        events={activeExternalEvents?.events ?? []}
      />
    </>
  );
}
