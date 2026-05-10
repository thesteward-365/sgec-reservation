'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BrandHeader } from '@/components/layout/brand-header';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import {
  MonthlyCalendar,
  type CalendarEvent,
} from '@/components/calendar/monthly-calendar';
import {
  FilterSheet,
  type FilterState,
} from '@/components/reservations/filter-sheet';
import { Chip } from '@/components/ui/chip';

type ReservationStatus = 'active' | 'cancelled';
type AdminReservation = {
  id: number;
  placeId: number;
  placeName: string | null;
  floorId: number | null;
  floorName: string | null;
  userName: string | null;
  purpose: string;
  startTime: string | null;
  endTime: string | null;
  status: ReservationStatus;
};

type ExternalEventResponse = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  description: string | null;
};

type PlaceTagMap = Record<number, number[]>;

type ListTab = '예정' | '지난 예약' | '전체';
type MainView = 'calendar' | 'list';

function toYMD(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 구글 캘린더 종일 일정(00:00:00 종료) 처리를 위한 헬퍼
function toEffectiveYMD(isoString: string, isEnd: boolean): string {
  const d = new Date(isoString);
  if (
    isEnd &&
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0
  ) {
    // 00:00:00에 끝나면 실제로는 전날 종료된 것으로 처리
    d.setDate(d.getDate() - 1);
  }
  return toYMD(d);
}

function isSameDay(a: Date | string, b: Date): boolean {
  const d = typeof a === 'string' ? new Date(a) : a;
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
}

function formatDateHeader(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isPast(isoString: string): boolean {
  const d = new Date(isoString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

const VIEW_CHIPS: { value: MainView; label: string }[] = [
  { value: 'calendar', label: '캘린더' },
  { value: 'list', label: '전체 목록' },
];

const LIST_TABS: ListTab[] = ['예정', '지난 예약', '전체'];

const CHIP_BASE =
  'inline-flex items-center justify-center rounded-pill px-4 py-1.5 text-[13px] font-semibold transition-colors';
const CHIP_ACTIVE = 'bg-(--color-fg-strong) text-white';
const CHIP_INACTIVE = 'bg-(--color-neutral-300) text-foreground';

// 행사 정보 카드 컴포넌트 (스토리북 디자인 반영)
function InformationalEventCard({
  title,
  startTime,
  endTime,
}: {
  title: string;
  startTime: string;
  endTime: string;
}) {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const isSingleDay = toYMD(startDate) === toYMD(endDate);

  const dateRangeLabel = isSingleDay
    ? `${startDate.getMonth() + 1}월 ${startDate.getDate()}일`
    : `${startDate.getMonth() + 1}월 ${startDate.getDate()}일 ~ ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;

  return (
    <div className="border-b border-blue-100/50 bg-blue-50/30 p-4 text-blue-700 last:border-0">
      <div className="mb-1.5 flex items-center gap-1.5 opacity-80">
        <CalendarIcon className="size-3.5 shrink-0" />
        <span className="text-[12px] font-bold tracking-tight uppercase">
          Event
        </span>
      </div>
      <h4 className="text-foreground mb-0.5 text-[16px] leading-tight font-bold">
        {title}
      </h4>
      <p className="text-[13px] font-medium opacity-60">{dateRangeLabel}</p>
    </div>
  );
}

export default function ReservationsPage() {
  const router = useRouter();
  const [view, setView] = useState<MainView>('calendar');
  const [listTab, setListTab] = useState<ListTab>('예정');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [placeTagMap, setPlaceTagMap] = useState<PlaceTagMap>({});
  const [filter, setFilter] = useState<FilterState>({
    floorId: null,
    tagId: null,
    sortOrder: 'asc',
    includeCancelled: false,
    onlyMine: false,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => new Date());

  // 데이터 로딩: 예약, 장소
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/reservations').then((r) => r.json()),
      fetch('/api/places').then((r) => r.json()),
    ])
      .then(([adminReservations, places]) => {
        setReservations(adminReservations as AdminReservation[]);

        const map: PlaceTagMap = {};
        (places as any[]).forEach((place) => {
          map[place.id] = (place.tags ?? []).map(
            (tag: { id: number }) => tag.id
          );
        });
        setPlaceTagMap(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 외부 행사 로딩 (월별)
  useEffect(() => {
    const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;
    fetch(`/api/external-events?month=${monthStr}`)
      .then((r) => r.json())
      .then((data: ExternalEventResponse[]) => {
        setExternalEvents(
          (data || []).map((ev) => ({
            id: ev.id,
            title: ev.title,
            startDate: toEffectiveYMD(ev.startTime, false),
            endDate: toEffectiveYMD(ev.endTime, true),
            variant: 'accent', // 기본 테마색
          }))
        );
      })
      .catch(console.error);
  }, [viewMonth]);

  const filteredReservations = useMemo(() => {
    let list = reservations;

    if (filter.floorId !== null) {
      list = list.filter(
        (reservation) => reservation.floorId === filter.floorId
      );
    }
    if (filter.tagId !== null) {
      list = list.filter((reservation) =>
        (placeTagMap[reservation.placeId] ?? []).includes(filter.tagId!)
      );
    }

    if (!filter.includeCancelled) {
      list = list.filter((reservation) => reservation.status !== 'cancelled');
    }

    return [...list].sort((a, b) => {
      const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
      return filter.sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });
  }, [filter, placeTagMap, reservations]);

  const indicatorDates = useMemo(
    () =>
      new Set(
        filteredReservations
          .filter((r) => r.startTime)
          .map((r) => toYMD(r.startTime!))
      ),
    [filteredReservations]
  );

  const dailyList = useMemo(
    () =>
      filteredReservations.filter(
        (reservation) =>
          reservation.startTime &&
          isSameDay(reservation.startTime, selectedDate)
      ),
    [filteredReservations, selectedDate]
  );

  const dailyEvents = useMemo(() => {
    const ymd = toYMD(selectedDate);
    return externalEvents.filter(
      (ev) => ymd >= ev.startDate && ymd <= ev.endDate
    );
  }, [externalEvents, selectedDate]);

  const activeFilter =
    filter.floorId !== null ||
    filter.tagId !== null ||
    filter.sortOrder !== 'asc';

  const listViewReservations = filteredReservations.filter((reservation) => {
    if (!reservation.startTime) return listTab === '전체';
    if (listTab === '예정') return !isPast(reservation.startTime);
    if (listTab === '지난 예약') return isPast(reservation.startTime);
    return true;
  });

  const groupedListView = useMemo(() => {
    const groups = new Map<string, AdminReservation[]>();

    for (const reservation of listViewReservations) {
      const key = reservation.startTime
        ? toYMD(reservation.startTime)
        : '날짜 없음';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(reservation);
    }

    return Array.from(groups.entries()).sort(([a], [b]) =>
      filter.sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );
  }, [filter.sortOrder, listViewReservations]);

  return (
    <>
      <BrandHeader />
      <div className="flex items-end justify-between px-5 pt-1 pb-4">
        <h2 className="text-h2 text-foreground font-bold">예약 관리</h2>

        <button
          type="button"
          onClick={() => setShowFilter(true)}
          className="relative flex size-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
          aria-label="필터"
        >
          <AdjustmentsHorizontalIcon className="text-foreground size-5" />
          {activeFilter && (
            <span className="bg-primary absolute top-1 right-1 size-2 rounded-full" />
          )}
        </button>
      </div>
      <main className="flex-1 pb-10">
        <div className="space-y-4 px-5">
          <div className="flex flex-wrap gap-1.5">
            {VIEW_CHIPS.map((item) => (
              <Chip
                key={item.value}
                variant={view === item.value ? 'active' : 'inactive'}
                size="md"
                onClick={() => setView(item.value)}
              >
                {item.label}
              </Chip>
            ))}
          </div>

          {view === 'calendar' ? (
            <div className="space-y-5">
              <MonthlyCalendar
                selectedDate={selectedDate}
                viewMonth={viewMonth}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setViewMonth(
                    new Date(date.getFullYear(), date.getMonth(), 1)
                  );
                }}
                onChangeMonth={setViewMonth}
                indicators={indicatorDates}
                events={externalEvents}
              />

              {loading ? (
                <ListSkeleton count={2} className="px-1" />
              ) : dailyList.length === 0 && dailyEvents.length === 0 ? (
                <>
                  <div className="mt-8 flex items-center justify-between gap-2">
                    <h3 className="text-foreground text-[16px]! font-bold">
                      {selectedDate.toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </h3>
                  </div>
                  <div className="bg-card rounded-xl px-4 py-10 text-center shadow-(--shadow-1)">
                    <p className="text-foreground text-[15px] font-semibold">
                      일정이 없는 날이에요
                    </p>
                  </div>{' '}
                </>
              ) : (
                <>
                  <div className="mt-8 flex items-center justify-between gap-2">
                    <h3 className="text-foreground text-[16px]! font-bold">
                      {selectedDate.toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </h3>
                    <span className="text-muted-foreground text-[14px]!">
                      예약 {dailyList.length}건
                    </span>
                  </div>

                  <div className="bg-card overflow-hidden rounded-xl shadow-(--shadow-1)">
                    {/* 행사 안내 카드 (최상단 고정) */}
                    {dailyEvents.map((ev) => (
                      <InformationalEventCard
                        key={ev.id}
                        title={ev.title}
                        startTime={ev.startDate}
                        endTime={ev.endDate}
                      />
                    ))}

                    {/* 예약 목록 */}
                    <div className="divide-border/50 divide-y">
                      {dailyList.map((reservation) => (
                        <button
                          key={reservation.id}
                          type="button"
                          onClick={() =>
                            router.push(`/admin/reservations/${reservation.id}`)
                          }
                          className="w-full rounded-none px-4 py-4 text-left transition hover:bg-neutral-50 active:bg-neutral-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex min-w-18 flex-col items-center justify-center rounded-lg bg-neutral-50 px-3 py-2 text-center">
                              <span className="text-foreground font-bold tabular-nums">
                                {formatTime(reservation.startTime!)}
                              </span>
                              <span className="text-muted-foreground mt-1 text-[14px] tabular-nums">
                                {formatTime(reservation.endTime!)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                <p className="text-foreground truncate text-[16px]! font-bold">
                                  {reservation.placeName
                                    ? `${reservation.floorName} ${reservation.placeName}`
                                    : '장소 없음'}
                                </p>

                                {reservation.status === 'cancelled' && (
                                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600">
                                    취소됨
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground mt-2 text-[14px]! leading-snug">
                                {reservation.userName
                                  ? `${reservation.userName} · `
                                  : ''}
                                {reservation.purpose}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-1.5 px-1">
                {LIST_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setListTab(tab)}
                    className={cn(
                      CHIP_BASE,
                      listTab === tab ? CHIP_ACTIVE : CHIP_INACTIVE
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {loading ? (
                <ListSkeleton count={3} />
              ) : groupedListView.length === 0 ? (
                <div className="bg-card rounded-xl px-4 py-10 text-center shadow-(--shadow-1)">
                  <p className="text-foreground text-[15px] font-semibold">
                    예약 내역이 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-5 px-1">
                  {groupedListView.map(([dateKey, items]) => (
                    <div key={dateKey} className="mb-8 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-foreground text-body! font-bold">
                            {items[0].startTime
                              ? formatDateHeader(items[0].startTime)
                              : dateKey}
                          </h3>

                          {dateKey === toYMD(now) && (
                            <Badge
                              variant="subtle"
                              className="bg-transparent px-2 py-0.5 text-[14px]! font-bold"
                            >
                              오늘
                            </Badge>
                          )}

                          {/* 리스트 뷰 날짜 헤더 옆 행사 배지 */}
                          {externalEvents.some(
                            (ev) =>
                              dateKey >= ev.startDate && dateKey <= ev.endDate
                          ) && (
                            <Badge className="border-none bg-blue-50 px-2 py-0.5 text-[12px]! text-blue-700">
                              {
                                externalEvents.find(
                                  (ev) =>
                                    dateKey >= ev.startDate &&
                                    dateKey <= ev.endDate
                                )?.title
                              }
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[13px]">
                            {items.length}건
                          </span>
                        </div>
                      </div>
                      <List>
                        {items.map((reservation) => (
                          <ListItem key={reservation.id} className="px-0 py-0">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/admin/reservations/${reservation.id}`
                                )
                              }
                              className="w-full rounded-none px-4 py-4 text-left transition hover:bg-neutral-50 active:bg-neutral-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex min-w-18 flex-col items-center justify-center rounded-lg bg-neutral-50 px-3 py-2 text-center">
                                  <span className="text-foreground font-bold tabular-nums">
                                    {formatTime(reservation.startTime!)}
                                  </span>
                                  <span className="text-muted-foreground mt-1 text-[14px] tabular-nums">
                                    {formatTime(reservation.endTime!)}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-3">
                                    <p className="text-foreground truncate text-[16px]! font-bold">
                                      {reservation.placeName
                                        ? `${reservation.floorName} ${reservation.placeName}`
                                        : '장소 없음'}
                                    </p>
                                    {reservation.status === 'cancelled' && (
                                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600">
                                        취소됨
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground mt-2 text-[14px]! leading-snug">
                                    {reservation.userName
                                      ? `${reservation.userName} · `
                                      : ''}
                                    {reservation.purpose}
                                  </p>
                                </div>
                              </div>
                            </button>
                          </ListItem>
                        ))}
                      </List>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Link
        href={`/reserve?date=${toYMD(selectedDate)}`}
        className="fixed right-5 bottom-24 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--color-fg-strong) text-white shadow-[0_10px_20px_rgba(0,0,0,0.16)] transition hover:bg-(--color-fg-strong)/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        aria-label="예약하기"
      >
        <PlusIcon className="h-6 w-6" aria-hidden="true" />
      </Link>

      <FilterSheet
        open={showFilter}
        onClose={() => setShowFilter(false)}
        current={filter}
        onApply={(state) => setFilter(state)}
      />
    </>
  );
}
