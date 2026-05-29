'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Cog6ToothIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { WeeklyCalendar } from '@/components/ui/weekly-calendar';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Chip } from '@/components/ui/chip';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { BrandHeader } from '@/components/layout/brand-header';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/components/calendar/monthly-calendar';
import {
  formatExternalEventDateRangeLabel,
  getExternalEventDateRange,
} from '@/lib/external-event-dates';

type Floor = { id: number; name: string; order: number };
type Tag = { id: number; name: string };
type Place = {
  id: number;
  name: string;
  description: string | null;
  floorId: number;
  floorName: string | null;
  isPinned: boolean;
  tags: { id: number | null; name: string | null }[];
};

type ExternalEventResponse = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  description: string | null;
};

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateParam(str: string | null): Date | null {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, mo, d] = str.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

// mirrors startOfWeek in weekly-calendar.tsx (Sunday = 0)
function getWeekStartStr(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return formatLocalDate(d);
}

// 행사 정보 카드 컴포넌트 (관리자 페이지와 동일)
function InformationalEventCard({
  title,
  startTime,
  endTime,
  isAllDay,
}: {
  title: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
}) {
  const dateRangeLabel = formatExternalEventDateRangeLabel(
    { startTime, endTime, isAllDay },
    { includeAllDaySuffix: true }
  );

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

type ReserveViewProps = {
  userName?: string;
};

export function ReserveView({ userName }: ReserveViewProps) {
  const searchParams = useSearchParams();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(
    () => parseDateParam(searchParams.get('date')) ?? today
  );
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(() =>
    searchParams.get('floor') ? Number(searchParams.get('floor')) : null
  );
  const [selectedTagId, setSelectedTagId] = useState<number | null>(() =>
    searchParams.get('tag') ? Number(searchParams.get('tag')) : null
  );
  const [weekStartStr, setWeekStartStr] = useState(() =>
    getWeekStartStr(selectedDate)
  );

  const [floors, setFloors] = useState<Floor[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [countsMap, setCountsMap] = useState<
    Record<number, Record<string, number>>
  >({});

  const [showFilter, setShowFilter] = useState(false);
  const [draftFloorId, setDraftFloorId] = useState<number | null>(null);
  const [draftTagId, setDraftTagId] = useState<number | null>(null);

  const refreshCounts = useCallback(() => {
    const [sy, sm, sd] = weekStartStr.split('-').map(Number);
    const weekEndDate = new Date(sy, sm - 1, sd + 6);
    const params = new URLSearchParams();
    params.set('startDate', weekStartStr);
    params.set('endDate', formatLocalDate(weekEndDate));

    fetch(`/api/reservations/counts?${params}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setCountsMap)
      .catch(() => {});
  }, [weekStartStr]);

  // 정적 데이터 — 마운트 시 1회
  useEffect(() => {
    fetch('/api/floors')
      .then((r) => r.json())
      .then(setFloors)
      .catch(() => {});
    fetch('/api/tags')
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
    fetch('/api/places')
      .then((r) => r.json())
      .then((data) => {
        setAllPlaces(data);
        setLoadingPlaces(false);
      })
      .catch(() => setLoadingPlaces(false));
  }, []);

  // 외부 행사 로딩 (선택된 날짜의 월 기준)
  useEffect(() => {
    const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    fetch(`/api/external-events?month=${monthStr}`)
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
              variant: 'accent',
            };
          })
        );
      })
      .catch(console.error);
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  // 예약 건수 — 주 변경 시에만
  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refreshCounts();
      }
    }

    window.addEventListener('focus', refreshCounts);
    window.addEventListener('pageshow', refreshCounts);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshCounts);
      window.removeEventListener('pageshow', refreshCounts);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshCounts]);

  function pushUrl(date: Date, floorId: number | null, tagId: number | null) {
    const params = new URLSearchParams();
    params.set('date', formatLocalDate(date));
    if (floorId) params.set('floor', String(floorId));
    if (tagId) params.set('tag', String(tagId));
    window.history.replaceState(null, '', `/reserve?${params}`);
  }

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    const newWeekStart = getWeekStartStr(date);
    if (newWeekStart !== weekStartStr) setWeekStartStr(newWeekStart);
    pushUrl(date, selectedFloorId, selectedTagId);
  }

  function handleFloorChipClick(id: number | null) {
    const next = selectedFloorId === id ? null : id;
    setSelectedFloorId(next);
    pushUrl(selectedDate, next, selectedTagId);
  }

  function handleOpenFilter() {
    setDraftFloorId(selectedFloorId);
    setDraftTagId(selectedTagId);
    setShowFilter(true);
  }

  function handleApplyFilter() {
    setSelectedFloorId(draftFloorId);
    setSelectedTagId(draftTagId);
    pushUrl(selectedDate, draftFloorId, draftTagId);
    setShowFilter(false);
  }

  function handleResetFilter() {
    setDraftFloorId(null);
    setDraftTagId(null);
  }

  // 클라이언트 필터링 — 상태 없이 파생
  const filteredPlaces = allPlaces.filter((p) => {
    if (selectedFloorId !== null && p.floorId !== selectedFloorId) return false;
    if (selectedTagId !== null && !p.tags.some((t) => t.id === selectedTagId))
      return false;
    return true;
  });

  const getIndicator = useCallback(
    (date: Date): boolean => {
      const key = formatLocalDate(date);
      return Object.values(countsMap).some((dc) => (dc[key] ?? 0) > 0);
    },
    [countsMap]
  );

  const dailyEvents = useMemo(() => {
    const ymd = formatLocalDate(selectedDate);
    return externalEvents.filter(
      (ev) => ymd >= ev.startDate && ymd <= ev.endDate
    );
  }, [externalEvents, selectedDate]);

  const hasActiveFilter = selectedFloorId !== null || selectedTagId !== null;

  return (
    <div className="flex flex-col">
      <BrandHeader />

      {/* 인사 문구 (스크롤 시 사라짐) */}
      <div className="px-5 pt-4 pb-2">
        <h2
          className="text-h2 text-foreground font-bold"
          style={{ lineHeight: 1.3 }}
        >
          {userName ? `${userName}님,` : '반가워요!'}
          <br />
          기쁨과 감사함으로 섬깁시다.
        </h2>
        <p className="text-body text-muted-foreground mt-3">
          예약할 날짜와 장소를 선택해 주세요.
        </p>
      </div>

      {/* sticky: 캘린더 + 장소 필터 */}
      <div
        className="sticky top-0 z-10 bg-(--color-neutral-150) pt-3"
        style={{ willChange: 'transform' }}
      >
        {/* 캘린더 카드 */}
        <div className="bg-card mx-5 mb-4 rounded-2xl px-2 py-3.5 shadow-(--shadow-1)">
          <WeeklyCalendar
            defaultDate={selectedDate}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            getIndicator={getIndicator}
          />
        </div>

        {/* 장소 섹션 헤더 */}
        <div className="mb-3 flex items-center justify-between px-5">
          <h3 className="text-body text-foreground font-bold">장소</h3>
          <button
            onClick={handleOpenFilter}
            className={cn(
              'text-body-sm flex items-center gap-1 font-medium transition-colors duration-120 ease-(--ease-standard)',
              hasActiveFilter ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <AdjustmentsHorizontalIcon className="size-3.5" />
            필터
            {hasActiveFilter && (
              <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            )}
          </button>
        </div>

        {/* 층 칩 스트립 */}
        {floors.length > 0 && (
          <div className="scrollbar-none mb-3 flex gap-1.5 overflow-x-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip
              size="sm"
              variant={selectedFloorId === null ? 'active' : 'inactive'}
              onClick={() => handleFloorChipClick(null)}
              className="whitespace-nowrap"
            >
              전체
            </Chip>
            {floors.map((floor) => (
              <Chip
                key={floor.id}
                size="sm"
                variant={selectedFloorId === floor.id ? 'active' : 'inactive'}
                onClick={() => handleFloorChipClick(floor.id)}
                className="whitespace-nowrap"
              >
                {floor.name}
              </Chip>
            ))}
          </div>
        )}
      </div>
      {/* /sticky */}

      {/* 장소 목록 */}
      <div className="flex flex-col gap-2 px-5 pt-2 pb-8">
        {loadingPlaces ? (
          <ListSkeleton count={4} />
        ) : filteredPlaces.length === 0 ? (
          <List emptyMessage="등록된 장소가 없습니다." />
        ) : (
          <List>
            {filteredPlaces.map((place) => {
              const count =
                countsMap[place.id]?.[formatLocalDate(selectedDate)] ?? 0;
              return (
                <ListItem key={place.id} className="px-0 py-0">
                  <Link
                    href={`/reserve/${place.id}?date=${formatLocalDate(selectedDate)}`}
                  >
                    <div className="bg-card flex items-center gap-3 px-4.5 py-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-center gap-1">
                          {place.isPinned && (
                            <BookmarkSolidIcon className="size-4 shrink-0 text-neutral-950" />
                          )}
                          <span className="text-body-lg text-foreground font-bold">
                            {place.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {place.floorName && (
                            <span className="text-caption text-muted-foreground">
                              {place.floorName}
                            </span>
                          )}
                          {place.tags
                            .filter((t) => t.name)
                            .map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-muted-foreground rounded-full bg-neutral-200 px-2 py-0.5 font-medium"
                                style={{ fontSize: 11 }}
                              >
                                #{tag.name}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className="text-muted-foreground mb-0.5 leading-none font-medium"
                          style={{ fontSize: 11 }}
                        >
                          예약
                        </p>
                        <p
                          className={`text-body text-${count > 0 ? 'primary' : 'muted-foreground'} font-bold tabular-nums`}
                        >
                          {count}건
                        </p>
                      </div>
                    </div>
                  </Link>
                </ListItem>
              );
            })}
          </List>
        )}
      </div>

      {/* 필터 바텀시트 */}
      <Drawer open={showFilter} onOpenChange={setShowFilter}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>필터</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-2">
            {floors.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-h5 text-foreground font-bold">층</h3>
                <div className="flex flex-wrap gap-2">
                  {floors.map((floor) => (
                    <Chip
                      key={floor.id}
                      size="sm"
                      variant={
                        draftFloorId === floor.id ? 'active' : 'inactive'
                      }
                      onClick={() =>
                        setDraftFloorId(
                          draftFloorId === floor.id ? null : floor.id
                        )
                      }
                    >
                      {floor.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-h5 text-foreground font-bold">유형</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Chip
                      key={tag.id}
                      size="sm"
                      variant={draftTagId === tag.id ? 'active' : 'inactive'}
                      onClick={() =>
                        setDraftTagId(draftTagId === tag.id ? null : tag.id)
                      }
                    >
                      {tag.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DrawerFooter className="flex-row gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleResetFilter}
            >
              초기화
            </Button>
            <Button className="flex-2" onClick={handleApplyFilter}>
              적용하기
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
