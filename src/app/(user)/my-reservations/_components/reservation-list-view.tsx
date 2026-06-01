'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useQueries,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { ReservationItem, type MyReservation } from './reservation-item';
import { FilterState } from '@/components/reservations/filter-sheet';
import { Badge } from '@/components/ui/badge';
import {
  ExternalEventsSheet,
  type ExternalEventSheetItem,
} from '@/components/reservations/external-events-sheet';
import { getExternalEventDateRange } from '@/lib/external-event-dates';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

type ReservationListViewProps = {
  user: { id: number; name: string } | null | undefined;
  filter: FilterState;
  placeTagMap: Record<number, number[]>;
  onSelectReservation: (res: MyReservation) => void;
  now: Date;
};

function toYMD(dt: Date | string): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function ReservationListInner({
  user,
  filter,
  placeTagMap,
  onSelectReservation,
  now,
}: ReservationListViewProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [activeExternalEvents, setActiveExternalEvents] = useState<{
    dateLabel: string;
    events: ExternalEventSheetItem[];
  } | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['reservations', filter],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: (pageParam as number).toString(),
        limit: '40',
        order: filter.sortOrder,
        includeCancelled: filter.includeCancelled.toString(),
      });
      if (filter.floorId) params.set('floorId', filter.floorId.toString());

      const res = await fetch(`/api/my-reservations/list?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  // Intersection Observer for Infinite Scroll
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
    let list = data?.pages.flatMap((page) => page.data as MyReservation[]) ?? [];

    // Client-side filtering for complex logic (tagId, onlyMine)
    if (filter.tagId !== null) {
      list = list.filter((r) =>
        (placeTagMap[r.placeId] ?? []).includes(filter.tagId!)
      );
    }
    if (filter.onlyMine && user?.id) {
      list = list.filter((r) => r.userId === user.id);
    }

    return list;
  }, [data, filter, placeTagMap, user]);

  const grouped = useMemo(() => {
    const map = new Map<string, MyReservation[]>();
    for (const r of allItems) {
      const ymd = toYMD(r.startTime);
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd)!.push(r);
    }
    return Array.from(map.entries());
  }, [allItems]);

  // Dynamic external events fetching
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    for (const r of allItems) {
      const d = new Date(r.startTime);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(months);
  }, [allItems]);

  const externalEventsQueries = useQueries({
    queries: uniqueMonths.map((month) => ({
      queryKey: ['external-events', month],
      queryFn: async () => {
        const res = await fetch(`/api/external-events?month=${month}`);
        if (!res.ok) throw new Error('Failed to fetch external events');
        return res.json();
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    })),
  });

  const allExternalEvents = useMemo(() => {
    const events: any[] = [];
    externalEventsQueries.forEach((q) => {
      if (q.data) {
        (q.data as any[]).forEach((ev) => {
          const { startDate, endDate } = getExternalEventDateRange(ev);
          events.push({ ...ev, startDate, endDate });
        });
      }
    });
    return events;
  }, [externalEventsQueries]);

  const getExternalEventsForDate = (ymd: string): ExternalEventSheetItem[] => {
    return allExternalEvents
      .filter((ev) => ymd >= ev.startDate && ymd <= ev.endDate)
      .map((ev) => ({
        id: ev.id,
        title: ev.title,
        startTime: ev.startTime,
        endTime: ev.endTime,
        description: ev.description,
        isAllDay: ev.isAllDay,
      }));
  };

  if (isLoading) return <ListSkeleton count={5} />;
  if (status === 'error') return <p className="py-10 text-center text-red-500">데이터를 불러오지 못했습니다.</p>;
  if (grouped.length === 0) return <List emptyMessage="예약 내역이 없어요" />;

  return (
    <div className="flex flex-col gap-5">
      {grouped.map(([ymd, items]) => {
        const events = getExternalEventsForDate(ymd);
        const headerLabel = formatGroupHeader(ymd);

        return (
          <div key={ymd} className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-5">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h3 className="text-foreground shrink-0 text-[15px]! font-bold">
                  {headerLabel}
                </h3>

                {ymd === toYMD(now) && (
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
              <span className="text-muted-foreground shrink-0 text-[13px]">
                {items.length}건
              </span>
            </div>
            <List>
              {items.map((r) => (
                <ListItem key={r.id} className="px-0 py-0">
                  <ReservationItem
                    reservation={r}
                    isPast={new Date(r.endTime) < now}
                    isMine={r.userId === user?.id}
                    onTap={() => onSelectReservation(r)}
                    flat
                  />
                </ListItem>
              ))}
            </List>
          </div>
        );
      })}

      {/* Infinite Scroll Trigger */}
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

      <ExternalEventsSheet
        open={!!activeExternalEvents}
        onOpenChange={(open) => {
          if (!open) setActiveExternalEvents(null);
        }}
        dateLabel={activeExternalEvents?.dateLabel ?? ''}
        events={activeExternalEvents?.events ?? []}
      />
    </div>
  );
}

export function ReservationListView(props: ReservationListViewProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ReservationListInner {...props} />
    </QueryClientProvider>
  );
}
