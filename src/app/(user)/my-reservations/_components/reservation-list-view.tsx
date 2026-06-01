'use client';

import { useMemo, useEffect, useRef } from 'react';
import {
  useInfiniteQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { ReservationItem, type MyReservation } from './reservation-item';
import { FilterState } from '@/components/reservations/filter-sheet';

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
        limit: '40',
        order: filter.sortOrder,
        includeCancelled: filter.includeCancelled.toString(),
      });
      if (pageParam) params.set('cursor', pageParam as string);
      if (filter.floorId) params.set('floorId', filter.floorId.toString());

      const res = await fetch(`/api/my-reservations/list?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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

  if (isLoading) return <ListSkeleton count={5} />;
  if (status === 'error') return <p className="py-10 text-center text-red-500">데이터를 불러오지 못했습니다.</p>;
  if (grouped.length === 0) return <List emptyMessage="예약 내역이 없어요" />;

  return (
    <div className="flex flex-col gap-5">
      {grouped.map(([ymd, items]) => (
        <div key={ymd} className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-5">
            <h3 className="text-foreground shrink-0 text-[15px]! font-bold">
              {formatGroupHeader(ymd)}
            </h3>
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
      ))}

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
