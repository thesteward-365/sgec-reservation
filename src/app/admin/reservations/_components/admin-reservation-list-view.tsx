'use client';

import { useMemo, useEffect, useRef } from 'react';
import {
  useInfiniteQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { FilterState } from '@/components/reservations/filter-sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ExternalEventSheetItem } from '@/components/reservations/external-events-sheet';
import { CalendarEvent } from '@/components/calendar/monthly-calendar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

type AdminReservation = {
  id: number;
  userId: number | null;
  userName: string | null;
  placeId: number;
  placeName: string | null;
  floorId: number | null;
  floorName: string | null;
  purpose: string;
  startTime: string;
  endTime: string;
  status: 'active' | 'cancelled';
};

type ListTab = '예정' | '지난 예약' | '전체';

type AdminReservationListViewProps = {
  filter: FilterState;
  listTab: ListTab;
  now: Date;
  currentUser: { id: number; name: string } | null;
  externalEvents: (CalendarEvent & { raw: any })[];
  setActiveExternalEvents: (data: { dateLabel: string; events: ExternalEventSheetItem[] } | null) => void;
};

function toYMD(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function AdminReservationListInner({
  filter,
  listTab,
  now,
  currentUser,
  externalEvents,
  setActiveExternalEvents,
}: AdminReservationListViewProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['admin-reservations', filter, listTab],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: (pageParam as number).toString(),
        limit: '40',
        order: filter.sortOrder,
        includeCancelled: filter.includeCancelled.toString(),
        tab: listTab,
      });
      if (filter.floorId) params.set('floorId', filter.floorId.toString());

      const res = await fetch(`/api/admin/reservations/list?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = useMemo(() => {
    return data?.pages.flatMap((page) => page.data as AdminReservation[]) ?? [];
  }, [data]);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminReservation[]>();
    for (const r of allItems) {
      const d = new Date(r.startTime);
      const ymd = toYMD(d);
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd)!.push(r);
    }
    return Array.from(map.entries());
  }, [allItems]);

  function getExternalEventsForDate(ymd: string): ExternalEventSheetItem[] {
    return externalEvents
      .filter((event) => ymd >= event.startDate && ymd <= event.endDate)
      .map((event) => ({
        id: event.id as number,
        title: event.title,
        startTime: event.raw.startTime,
        endTime: event.raw.endTime,
        description: event.raw.description,
        isAllDay: event.raw.isAllDay,
      }));
  }

  if (isLoading) return <ListSkeleton count={5} />;
  if (status === 'error') return <p className="py-10 text-center text-red-500">데이터를 불러오지 못했습니다.</p>;
  if (grouped.length === 0) return <List emptyMessage="예약 내역이 없어요" />;

  return (
    <div className="space-y-5 px-1">
      {grouped.map(([dateKey, items]) => {
        const events = getExternalEventsForDate(dateKey);
        const headerLabel = items[0].startTime ? formatDateHeader(items[0].startTime) : dateKey;

        return (
          <div key={dateKey} className="mb-8 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h3 className="text-foreground shrink-0 text-body! font-bold">
                  {headerLabel}
                </h3>

                {dateKey === toYMD(now) && (
                  <Badge
                    variant="subtle"
                    className="shrink-0 bg-transparent px-2 py-0.5 text-[14px]! font-bold"
                  >
                    오늘
                  </Badge>
                )}

                {events.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveExternalEvents({
                        dateLabel: headerLabel,
                        events: events,
                      })
                    }
                    className="min-w-0 rounded-full transition-opacity hover:opacity-80"
                  >
                    <Badge
                      color="violet"
                      className="flex max-w-full items-center gap-1 border-none px-2 py-0.5 text-[12px]! font-bold"
                    >
                      <span className="truncate">{events[0].title}</span>
                      {events.length > 1 && (
                        <span className="shrink-0">
                          외 {events.length - 1}건
                        </span>
                      )}
                    </Badge>
                  </button>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
                    onClick={() => router.push(`/admin/reservations/${reservation.id}`)}
                    className="w-full rounded-none px-4 py-4 text-left transition hover:bg-neutral-50 active:bg-neutral-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex min-w-18 flex-col items-center justify-center rounded-lg bg-neutral-50 px-3 py-2 text-center">
                        <span className="text-foreground font-bold tabular-nums">
                          {formatTime(reservation.startTime)}
                        </span>
                        <span className="text-muted-foreground mt-1 text-[14px] tabular-nums">
                          {formatTime(reservation.endTime)}
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
                          {reservation.userName ? (
                            <span
                              className={cn(
                                currentUser?.id === reservation.userId &&
                                  'font-bold text-blue-600'
                              )}
                            >
                              {reservation.userName}
                            </span>
                          ) : (
                            ''
                          )}
                          {reservation.userName ? ' · ' : ''}
                          {reservation.purpose}
                        </p>
                      </div>
                    </div>
                  </button>
                </ListItem>
              ))}
            </List>
          </div>
        );
      })}

      <div ref={loadMoreRef} className="flex h-12 items-center justify-center py-4">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-muted-foreground text-sm font-medium">더 불러오는 중...</span>
          </div>
        ) : hasNextPage ? (
          <div className="h-4 w-full" />
        ) : null}
      </div>
    </div>
  );
}

export function AdminReservationListView(props: AdminReservationListViewProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminReservationListInner {...props} />
    </QueryClientProvider>
  );
}
