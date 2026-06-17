'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
  UserCircleIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { cn, getKSTToday } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BrandHeader } from '@/components/layout/brand-header';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MonthlyCalendar,
  type CalendarEvent,
} from '@/components/calendar/monthly-calendar';
import {
  FilterSheet,
  type FilterState,
} from '@/components/reservations/filter-sheet';
import { Chip } from '@/components/ui/chip';
import { compareReservationByDayAndTime } from '@/lib/services/reservation-sorting';
import {
  ExternalEventsSheet,
  type ExternalEventSheetItem,
} from '@/components/reservations/external-events-sheet';
import { getExternalEventDateRange } from '@/lib/external-event-dates';
import { AdminReservationListView } from './_components/admin-reservation-list-view';

type ReservationStatus = 'active' | 'cancelled';
type AdminReservation = {
  id: number;
  userId: number | null;
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
  isAllDay?: boolean;
  description: string | null;
};

type ExternalCalendarEvent = CalendarEvent & {
  raw: ExternalEventResponse;
};

type PlaceResponse = {
  id: number;
  tags?: { id: number }[];
};

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
  const today = getKSTToday();
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

function ReservationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const view = (searchParams.get('view') as MainView) || 'calendar';
  const listTab = (searchParams.get('listTab') as ListTab) || '예정';

  function setView(newView: MainView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', newView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setListTab(newTab: ListTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('listTab', newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const [selectedDate, setSelectedDate] = useState(() => getKSTToday());
  const [viewMonth, setViewMonth] = useState(() => {
    const now = getKSTToday();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>(
    []
  );
  const [placeTagMap, setPlaceTagMap] = useState<PlaceTagMap>({});
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    floorId: null,
    tagId: null,
    sortOrder: 'desc',
    includeCancelled: false,
    onlyMine: false,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeExternalEvents, setActiveExternalEvents] = useState<{
    dateLabel: string;
    events: ExternalEventSheetItem[];
  } | null>(null);
  const [now] = useState(() => getKSTToday());

  // 데이터 로딩: 예약, 장소, 계정
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/reservations').then((r) => r.json()),
      fetch('/api/places').then((r) => r.json()),
      fetch('/api/account').then((r) => r.json()),
    ])
      .then(([adminReservations, places, accountData]) => {
        setReservations(adminReservations as AdminReservation[]);

        const map: PlaceTagMap = {};
        (places as PlaceResponse[]).forEach((place) => {
          map[place.id] = (place.tags ?? []).map(
            (tag: { id: number }) => tag.id
          );
        });
        setPlaceTagMap(map);
        setCurrentUser(accountData.user || null);
      })
      .catch(console.error)
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

    if (filter.onlyMine && currentUser) {
      list = list.filter(
        (reservation) => reservation.userId === currentUser.id
      );
    }

    return [...list].sort((a, b) => {
      return compareReservationByDayAndTime(a, b, filter.sortOrder);
    });
  }, [filter, placeTagMap, reservations, currentUser]);

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
    filter.floorId !== null || filter.tagId !== null || filter.onlyMine;

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
  }, [filter, listViewReservations]);

  function getExternalEventsForDate(dateKey: string): ExternalEventSheetItem[] {
    return externalEvents
      .filter((event) => dateKey >= event.startDate && dateKey <= event.endDate)
      .map((event) => ({
        id: event.id,
        title: event.title,
        startTime: event.raw.startTime,
        endTime: event.raw.endTime,
        description: event.raw.description,
        isAllDay: event.raw.isAllDay,
      }));
  }

  const selectedDateLabel = selectedDate.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const selectedDateEvents = getExternalEventsForDate(toYMD(selectedDate));

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
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
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

            {view === 'list' && (
              <Select
                value={filter.sortOrder}
                onValueChange={(val) =>
                  setFilter((f) => ({
                    ...f,
                    sortOrder: val as 'asc' | 'desc',
                  }))
                }
                size="small"
              >
                <SelectTrigger className="w-[85px] rounded-sm border-0 bg-transparent p-0 px-1.5 py-0.5 text-[14px] font-medium shadow-none hover:bg-neutral-100 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">최신순</SelectItem>
                  <SelectItem value="asc">오래된순</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {view === 'calendar' ? (
            <div className="space-y-5">
              <div className="bg-card rounded-xl p-5 shadow-(--shadow-1)">
                <MonthlyCalendar
                  selectedDate={selectedDate}
                  viewMonth={viewMonth}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    const nextMonth = new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      1
                    );
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
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <h3 className="text-foreground shrink-0 text-[16px]! font-bold">
                        {selectedDateLabel}
                      </h3>

                      {selectedDateEvents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveExternalEvents({
                              dateLabel: selectedDateLabel,
                              events: selectedDateEvents,
                            });
                          }}
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
                      예약 {dailyList.length}건
                    </span>
                  </div>

                  <div className="bg-card overflow-hidden rounded-xl shadow-(--shadow-1)">
                    {/* 예약 목록 */}
                    <div className="divide-border/50 divide-y">
                      {dailyList.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <p className="text-foreground text-[15px] font-semibold">
                            예약 내역이 없습니다
                          </p>
                        </div>
                      ) : (
                        dailyList.map((reservation) => (
                          <button
                            key={reservation.id}
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
                                <div className="mt-2 flex flex-col gap-0.5 text-[14px]! leading-snug">
                                  {reservation.purpose && (
                                    <div className="flex items-center gap-1.5 text-neutral-900!">
                                      <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4 shrink-0" />
                                      <span className="truncate">
                                        {reservation.purpose}
                                      </span>
                                    </div>
                                  )}
                                  {reservation.userName && (
                                    <div
                                      className={cn(
                                        'flex items-center gap-1.5',
                                        currentUser?.id === reservation.userId
                                          ? 'font-bold! text-blue-600'
                                          : 'text-neutral-900!'
                                      )}
                                    >
                                      <UserCircleIcon className="h-4 w-4 shrink-0" />
                                      <span>{reservation.userName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
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

              <AdminReservationListView
                filter={filter}
                listTab={listTab}
                now={now}
                currentUser={currentUser}
              />
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

export default function ReservationsPage() {
  return (
    <Suspense fallback={<ListSkeleton count={3} className="p-5" />}>
      <ReservationsContent />
    </Suspense>
  );
}
