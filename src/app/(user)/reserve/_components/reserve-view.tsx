'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Cog6ToothIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { WeeklyCalendar } from '@/components/ui/weekly-calendar';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

type Floor = { id: number; name: string; order: number };
type Tag = { id: number; name: string };
type Place = {
  id: number;
  name: string;
  description: string | null;
  floorId: number;
  floorName: string | null;
  reservationCount: number;
  tags: { id: number | null; name: string | null }[];
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

const CHIP =
  'inline-flex items-center font-medium leading-none rounded-pill px-3 py-[6px] text-caption transition-colors duration-120 ease-(--ease-standard) cursor-pointer select-none whitespace-nowrap';

type ReserveViewProps = {
  userName?: string;
};

export function ReserveView({ userName }: ReserveViewProps) {
  const router = useRouter();
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

  const [floors, setFloors] = useState<Floor[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);

  const [showFilter, setShowFilter] = useState(false);
  const [draftFloorId, setDraftFloorId] = useState<number | null>(null);
  const [draftTagId, setDraftTagId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/floors')
      .then((r) => r.json())
      .then(setFloors)
      .catch(() => {});
    fetch('/api/tags')
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingPlaces(true);
    const params = new URLSearchParams();
    params.set('date', formatLocalDate(selectedDate));
    if (selectedFloorId) params.set('floorId', String(selectedFloorId));
    if (selectedTagId) params.set('tagId', String(selectedTagId));
    fetch(`/api/places?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPlaces(data);
        setLoadingPlaces(false);
      })
      .catch(() => setLoadingPlaces(false));
  }, [selectedFloorId, selectedTagId, selectedDate]);

  const pushUrl = useCallback(
    (date: Date, floorId: number | null, tagId: number | null) => {
      const params = new URLSearchParams();
      params.set('date', formatLocalDate(date));
      if (floorId) params.set('floor', String(floorId));
      if (tagId) params.set('tag', String(tagId));
      router.replace(`/reserve?${params}`, { scroll: false });
    },
    [router]
  );

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
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

  const hasActiveFilter = selectedFloorId !== null || selectedTagId !== null;

  return (
    <div className="flex flex-col">
      {/* sticky: 교회 헤더 + 인사 문구 + 캘린더 + 장소 헤더 + 층 칩 */}
      <div className="sticky top-0 z-10 bg-(--color-neutral-150)">
        {/* 교회 헤더 */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/logo-default.svg"
              alt="샘깊은교회 로고"
              className="h-14 w-auto shrink-0"
            />
            <div>
              <p
                className="text-muted-foreground mb-0.5 leading-none font-medium"
                style={{ fontSize: 12 }}
              >
                샘깊은교회
              </p>
              <p
                className="text-foreground leading-tight font-extrabold"
                style={{ fontSize: 14, fontWeight: 700 }}
              >
                문화사역 장소방
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-(--color-fg-strong) transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
          >
            <Cog6ToothIcon className="size-5" />
          </Link>
        </div>

        {/* 인사 문구 */}
        <div className="px-5 pt-4 pb-5">
          <h2
            className="text-h2 text-foreground font-bold"
            style={{ lineHeight: 1.3 }}
          >
            {userName ? `${userName}님,` : '안녕하세요,'}
            <br />
            언제 예약하시겠어요?
          </h2>
        </div>

        {/* 캘린더 카드 */}
        <div className="bg-card mx-5 mb-4 rounded-2xl px-2 py-3.5 shadow-(--shadow-1)">
          <WeeklyCalendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
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
          <div className="scrollbar-none mb-3 flex gap-1.5 overflow-x-auto px-5">
            <button
              onClick={() => handleFloorChipClick(null)}
              className={cn(
                CHIP,
                selectedFloorId === null
                  ? 'bg-(--color-fg-strong) text-white'
                  : 'text-foreground bg-neutral-300'
              )}
            >
              전체
            </button>
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => handleFloorChipClick(floor.id)}
                className={cn(
                  CHIP,
                  selectedFloorId === floor.id
                    ? 'bg-(--color-fg-strong) text-white'
                    : 'text-foreground bg-neutral-300'
                )}
              >
                {floor.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* /sticky */}

      {/* 장소 목록 */}
      <div className="flex flex-col gap-2 px-5 pb-8">
        {loadingPlaces ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted h-20 animate-pulse rounded-2xl" />
          ))
        ) : places.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-16 text-center">
            등록된 장소가 없습니다.
          </p>
        ) : (
          places.map((place) => (
            <Link
              key={place.id}
              href={`/reserve/${place.id}?date=${formatLocalDate(selectedDate)}`}
            >
              <div className="bg-card flex items-center gap-3 rounded-2xl px-4.5 py-4 shadow-(--shadow-1)">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-body-lg text-foreground font-bold">
                    {place.name}
                  </span>
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
                          className="text-muted-foreground rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium"
                        >
                          #{tag.name}
                        </span>
                      ))}
                  </div>
                </div>
                {place.reservationCount > 0 ? (
                  <div className="shrink-0 text-right">
                    <p className="text-muted-foreground mb-0.5 text-[11px] leading-none font-medium">
                      예약
                    </p>
                    <p className="text-body text-primary font-bold tabular-nums">
                      {place.reservationCount}건
                    </p>
                  </div>
                ) : (
                  <ChevronRightIcon className="text-muted-foreground size-5 flex-none" />
                )}
              </div>
            </Link>
          ))
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
                    <button
                      key={floor.id}
                      onClick={() =>
                        setDraftFloorId(
                          draftFloorId === floor.id ? null : floor.id
                        )
                      }
                      className={cn(
                        CHIP,
                        draftFloorId === floor.id
                          ? 'bg-(--color-fg-strong) text-white'
                          : 'text-foreground bg-neutral-300'
                      )}
                    >
                      {floor.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-h5 text-foreground font-bold">유형</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() =>
                        setDraftTagId(draftTagId === tag.id ? null : tag.id)
                      }
                      className={cn(
                        CHIP,
                        draftTagId === tag.id
                          ? 'bg-(--color-fg-strong) text-white'
                          : 'text-foreground bg-neutral-300'
                      )}
                    >
                      {tag.name}
                    </button>
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
