'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AdjustmentsHorizontalIcon,
  EllipsisVerticalIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BrandHeader } from '@/components/layout/brand-header';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { MonthlyCalendar } from '@/components/calendar/monthly-calendar';
import {
  FilterSheet,
  type FilterState,
} from '@/components/reservations/filter-sheet';
import {
  AdminReservationSheet,
  type AdminReservation,
} from '@/components/reservations/admin-reservation-sheet';
import { Chip } from '@/components/ui/chip';

type PlaceTagMap = Record<number, number[]>;

type ListTab = '예정' | '지난 예약' | '전체';
type MainView = 'calendar' | 'list';

function toYMD(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const today = new Date();

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

export default function ReservationsPage() {
  const [view, setView] = useState<MainView>('calendar');
  const [listTab, setListTab] = useState<ListTab>('예정');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [placeTagMap, setPlaceTagMap] = useState<PlaceTagMap>({});
  const [filter, setFilter] = useState<FilterState>({
    floorId: null,
    tagId: null,
    sortOrder: 'asc',
  });
  const [showFilter, setShowFilter] = useState(false);
  const [activeReservation, setActiveReservation] =
    useState<AdminReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => new Date());

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

  function refreshReservations() {
    setLoading(true);
    fetch('/api/admin/reservations')
      .then((r) => r.json())
      .then((data: AdminReservation[]) => setReservations(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function handleCancelled() {
    setActiveReservation(null);
    refreshReservations();
  }

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
                size="md" // 필요에 따라 sm, lg로 변경 가능
                onClick={() => setView(item.value)}
              >
                {item.label}
              </Chip>
            ))}
          </div>

          {view === 'calendar' ? (
            <div className="space-y-5">
              <div className="bg-card rounded-xl p-4 shadow-(--shadow-1)">
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
                />
              </div>

              {loading ? (
                <ListSkeleton count={2} className="px-1" />
              ) : dailyList.length === 0 ? (
                <div className="bg-card rounded-xl px-4 py-10 text-center shadow-(--shadow-1)">
                  <p className="text-foreground text-[15px] font-semibold">
                    예약이 없는 날이에요
                  </p>
                </div>
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
                      {dailyList.length}건
                    </span>
                  </div>
                  <div className="bg-card rounded-xl shadow-(--shadow-1)">
                    <div className="divide-border/50 divide-y">
                      {dailyList.map((reservation) => (
                        <button
                          key={reservation.id}
                          type="button"
                          onClick={() => setActiveReservation(reservation)}
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
                              </div>
                              <p className="text-muted-foreground text-[14px]! mt-2 leading-snug">
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
                              onClick={() => setActiveReservation(reservation)}
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
                                  </div>
                                  <p className="text-muted-foreground text-[14px]! mt-2 leading-snug">
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
                      {/* <div className="bg-card rounded-xl shadow-(--shadow-1)">
                        <div className="divide-border/50 divide-y">
                          {items.map((reservation) => (
                            <button
                              key={reservation.id}
                              type="button"
                              onClick={() => setActiveReservation(reservation)}
                              className="w-full rounded-none px-4 py-4 text-left transition hover:bg-neutral-50 active:bg-neutral-100"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <p className="text-foreground text-[16px]! font-bold">
                                    {reservation.placeName ?? '장소 없음'}
                                  </p>
                                  <p className="text-muted-foreground text-[13px]">
                                    {reservation.startTime &&
                                    reservation.endTime
                                      ? `${formatTime(reservation.startTime)} – ${formatTime(reservation.endTime)}`
                                      : '-'}
                                  </p>
                                </div>
                                {reservation.floorName && (
                                  <Badge
                                    variant="subtle"
                                    className="text-[11px]"
                                  >
                                    {reservation.floorName}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-caption text-muted-foreground mt-3">
                                {reservation.purpose}
                              </div>
                              <div className="text-caption text-foreground mt-1">
                                {reservation.userName ?? '예약자 미정'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div> */}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Link
        href="/reserve"
        className="fixed right-5 bottom-24 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--color-fg-strong) text-white shadow-[0_10px_20px_rgba(0,0,0,0.16)] transition hover:bg-(--color-fg-strong)/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="예약하기"
      >
        <PlusIcon className="h-6 w-6" aria-hidden="true" />
      </Link>

      <AdminReservationSheet
        reservation={activeReservation}
        open={!!activeReservation}
        onClose={() => setActiveReservation(null)}
        onCancelled={handleCancelled}
      />

      <FilterSheet
        open={showFilter}
        onClose={() => setShowFilter(false)}
        current={filter}
        onApply={(state) => setFilter(state)}
      />
    </>
  );
}
