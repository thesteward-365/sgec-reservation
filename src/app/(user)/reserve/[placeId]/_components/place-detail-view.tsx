'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ReservationTimeline } from '@/components/ui/reservation-timeline';
import { WeeklyCalendar } from '@/components/ui/weekly-calendar';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import {
  PURPOSE_PRESETS,
  type ReservationSchedule,
  formatLocalDate,
  formatMinuteLabel,
  getDateTimeForMinute,
  normalizeReservations,
  overlapsExistingRange,
  parseLocalDate,
} from '@/lib/services/reservation-slots';
import { LucideXCircle, XCircleIcon } from 'lucide-react';

type PickerPlace = {
  id: number;
  name: string;
  floorId: number;
  floorName: string | null;
  tags: { id: number | null; name: string | null }[];
};
type PickerFloor = { id: number; name: string };
type PickerTag = { id: number; name: string };

type PlaceDetailViewProps = {
  place: {
    id: number;
    name: string;
    description: string | null;
    floorName: string | null;
    tags: string[];
  };
  currentUser: { id: number; name: string };
  initialDate?: string;
};

const CHIP =
  'inline-flex items-center font-medium leading-none rounded-pill px-3 py-[6px] text-caption transition-colors duration-120 ease-(--ease-standard) cursor-pointer select-none whitespace-nowrap';

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function getInitialDate(value?: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatLocalDate(parseLocalDate(value) ?? today);
}

function formatKoreanDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export function PlaceDetailView({
  place,
  currentUser,
  initialDate,
}: PlaceDetailViewProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(getInitialDate(initialDate));
  const [reservations, setReservations] = useState<ReservationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState({
    startMin: 10 * 60,
    endMin: 11 * 60,
  });
  const [purpose, setPurpose] = useState('');
  const [isPending, startTransition] = useTransition();
  const purposeRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Place picker state
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [pickerPlaces, setPickerPlaces] = useState<PickerPlace[]>([]);
  const [pickerFloors, setPickerFloors] = useState<PickerFloor[]>([]);
  const [pickerTags, setPickerTags] = useState<PickerTag[]>([]);
  const [pickerFloorId, setPickerFloorId] = useState<number | null>(null);
  const [pickerTagId, setPickerTagId] = useState<number | null>(null);
  const [pickerLoaded, setPickerLoaded] = useState(false);

  // Date picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fetch reservations when place or date changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reservations?placeId=${place.id}&date=${selectedDate}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data: ReservationSchedule[]) => {
        if (!cancelled) {
          setReservations(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [place.id, selectedDate]);

  // Lazy-load place picker data on first open
  useEffect(() => {
    if (!placePickerOpen || pickerLoaded) return;
    Promise.all([
      fetch('/api/floors').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
      fetch('/api/places').then((r) => r.json()),
    ])
      .then(
        ([floorsData, tagsData, placesData]: [
          PickerFloor[],
          PickerTag[],
          PickerPlace[],
        ]) => {
          setPickerFloors(floorsData);
          setPickerTags(tagsData);
          setPickerPlaces(placesData);
          setPickerLoaded(true);
        }
      )
      .catch(() => {});
  }, [placePickerOpen, pickerLoaded]);

  const normalizedReservations = normalizeReservations(reservations);
  const collision = overlapsExistingRange(
    selection.startMin,
    selection.endMin,
    normalizedReservations,
    null
  );
  const canSubmit = !collision && purpose.trim().length > 0;

  const startLabel = formatMinuteLabel(selection.startMin);
  const endLabel = formatMinuteLabel(selection.endMin);
  const ctaLabel = isPending
    ? '처리 중...'
    : collision
      ? '시간을 변경해주세요'
      : !purpose.trim()
        ? '사용 목적을 입력하세요'
        : '예약하기';

  function handleCtaClick() {
    if (isPending) return;
    if (collision) {
      timelineRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    if (!purpose.trim()) {
      purposeRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    startTransition(async () => {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: place.id,
          startTime: getDateTimeForMinute(
            selectedDate,
            selection.startMin
          ).toISOString(),
          endTime: getDateTimeForMinute(
            selectedDate,
            selection.endMin
          ).toISOString(),
          purpose: purpose.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? '예약 저장에 실패했습니다.');
        return;
      }
      const params = new URLSearchParams({
        date: selectedDate,
        start: String(selection.startMin),
        end: String(selection.endMin),
        purpose: purpose.trim(),
      });
      router.push(`/reserve/${place.id}/complete?${params}`);
    });
  }

  const filteredPickerPlaces = pickerPlaces.filter((p) => {
    if (pickerFloorId !== null && p.floorId !== pickerFloorId) return false;
    if (pickerTagId !== null && !p.tags.some((t) => t.id === pickerTagId))
      return false;
    return true;
  });

  return (
    <>
      {/* 고정 AppBar */}
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          <Link
            href={`/reserve?date=${selectedDate}`}
            className="text-foreground flex size-10 items-center justify-center rounded-xl transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          <p className="text-body text-foreground flex-1 text-center font-bold">
            예약하기
          </p>
          <div className="size-10" />
        </div>
      </div>

      {/* 스크롤 콘텐츠 */}
      <div className="pt-14 pb-44">
        {/* 장소 섹션 */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-body text-foreground mb-2 pl-1 font-bold">장소</p>
          <div className="bg-card rounded-2xl shadow-(--shadow-1)">
            <button
              className="flex w-full items-center px-4 py-4"
              onClick={() => setPlacePickerOpen(true)}
            >
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                <p className="text-foreground text-[16px] font-bold!">
                  {place.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {place.floorName && (
                    <span className="text-caption text-muted-foreground rounded-full bg-neutral-200 px-2.5 py-1 font-medium">
                      {place.floorName}
                    </span>
                  )}
                  {place.tags.map((t) => (
                    <span
                      key={t}
                      className="text-caption text-muted-foreground rounded-full bg-neutral-200 px-2.5 py-1 font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRightIcon className="text-muted-foreground ml-3 size-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* 시간 섹션 */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-body text-foreground mb-2 pl-1 font-bold">시간</p>
          <div
            ref={timelineRef}
            className="bg-card rounded-2xl px-3 py-4 shadow-(--shadow-1)"
          >
            <div className="flex items-baseline justify-between px-1 pb-3">
              <button
                className="hover:bg-muted flex items-center gap-1 rounded-lg px-1 py-0.5 transition-colors"
                onClick={() => setDatePickerOpen(true)}
              >
                <span className="text-foreground text-[16px] font-bold">
                  {formatKoreanDate(selectedDate)}
                </span>
                <ChevronRightIcon className="text-muted-foreground size-3.5" />
              </button>
            </div>
            {loading ? (
              <div className="bg-muted h-40 animate-pulse rounded-xl" />
            ) : (
              <ReservationTimeline
                key={`${place.id}-${selectedDate}`}
                reservations={normalizedReservations}
                selection={selection}
                onSelectionChange={setSelection}
                collision={collision}
              />
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() =>
                  setSelection((s) => ({
                    startMin: s.startMin,
                    endMin: Math.max(s.startMin + 30, s.endMin - 30),
                  }))
                }
                disabled={selection.endMin - selection.startMin <= 30}
                className="text-caption text-foreground bg-card flex-1 cursor-pointer rounded-xl border border-neutral-300 py-2 font-semibold shadow-sm transition-colors duration-120 ease-(--ease-standard) select-none hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                −30분
              </button>
              <span className="text-foreground w-[80px] min-w-16 text-center text-[14px] font-bold tabular-nums">
                {formatDuration(selection.endMin - selection.startMin)}
              </span>
              <button
                onClick={() =>
                  setSelection((s) => ({
                    startMin: s.startMin,
                    endMin: Math.min(s.endMin + 30, 24 * 60),
                  }))
                }
                disabled={selection.endMin >= 24 * 60}
                className="text-caption text-foreground bg-card flex-1 cursor-pointer rounded-xl border border-neutral-300 py-2 font-semibold shadow-sm transition-colors duration-120 ease-(--ease-standard) select-none hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +30분
              </button>
            </div>
          </div>
        </div>

        {/* 사용 목적 섹션 */}
        <div ref={purposeRef} className="mb-6 px-5 pt-3">
          <p className="text-body text-foreground mb-2 pl-1 font-bold">
            사용 목적
          </p>
          <div className="bg-card flex flex-col gap-3 rounded-2xl px-4 py-4 shadow-(--shadow-1)">
            <div className="flex flex-wrap gap-2">
              {PURPOSE_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPurpose(p)}
                  className={cn(
                    CHIP,
                    purpose === p
                      ? 'bg-(--color-fg-strong) text-white'
                      : 'text-foreground bg-neutral-300'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="relative flex items-center">
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="직접 입력 (예: 청년부 모임)"
                maxLength={100}
                className="pr-10" // 오른쪽에 X 버튼이 들어갈 공간 확보
              />
              {purpose && (
                <button
                  onClick={() => setPurpose('')}
                  className="text-muted-foreground hover:text-foreground absolute right-3 flex h-full items-center justify-center transition-colors"
                  type="button" // 폼 제출 방지
                >
                  <LucideXCircle className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 고정 하단 CTA */}
      <div className="bg-background fixed inset-x-0 bottom-0 z-50 border-t border-(--color-border-subtle)">
        <div
          className="mx-auto max-w-107.5 px-5 pt-3"
          style={{
            paddingBottom:
              'calc(1.5rem + max(env(safe-area-inset-bottom), 8px))',
          }}
        >
          {/* 장소·날짜 요약 */}
          <div className="mb-1.5 flex justify-between">
            <span className="text-muted-foreground max-w-[55%] truncate text-[11px]">
              {place.name}
            </span>
            <span className="text-muted-foreground text-[11px]">
              {formatKoreanDate(selectedDate)}
            </span>
          </div>
          {/* 시간·소요시간 */}
          <div className="mb-3 flex justify-between">
            <div>
              <p
                className="text-muted-foreground text-[11px] font-medium"
                style={{ letterSpacing: '0.012em' }}
              >
                선택 시간
              </p>
              <p
                className={cn(
                  'text-[17px] font-bold tabular-nums',
                  collision ? 'text-(--color-danger)' : 'text-foreground'
                )}
              >
                {startLabel} – {endLabel}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-muted-foreground text-[11px] font-medium"
                style={{ letterSpacing: '0.012em' }}
              >
                {collision ? '겹치는 예약' : '소요 시간'}
              </p>
              <p
                className={cn(
                  'text-[17px] font-bold',
                  collision ? 'text-(--color-danger)' : 'text-foreground'
                )}
              >
                {collision
                  ? '⚠ 변경 필요'
                  : `${selection.endMin - selection.startMin}분`}
              </p>
            </div>
          </div>
          <button
            onClick={handleCtaClick}
            className={cn(
              'rounded-pill text-body-sm w-full px-6 py-3.5 font-semibold tracking-wide transition-all duration-120 ease-(--ease-standard)',
              canSubmit && !isPending
                ? 'bg-primary text-primary-foreground hover:bg-accent-hover'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* 장소 선택 Drawer */}
      <Drawer open={placePickerOpen} onOpenChange={setPlacePickerOpen}>
        <DrawerContent className="bg-(--color-neutral-150)">
          <DrawerHeader>
            <DrawerTitle>장소 선택</DrawerTitle>
          </DrawerHeader>
          {/* 필터 칩 */}
          <div className="flex flex-col gap-2 px-5 pb-3">
            {pickerFloors.length > 0 && (
              <div className="scrollbar-none flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setPickerFloorId(null)}
                  className={cn(
                    CHIP,
                    pickerFloorId === null
                      ? 'bg-(--color-fg-strong) text-white'
                      : 'text-foreground bg-neutral-300'
                  )}
                >
                  전체
                </button>
                {pickerFloors.map((f) => (
                  <button
                    key={f.id}
                    onClick={() =>
                      setPickerFloorId(pickerFloorId === f.id ? null : f.id)
                    }
                    className={cn(
                      CHIP,
                      pickerFloorId === f.id
                        ? 'bg-(--color-fg-strong) text-white'
                        : 'text-foreground bg-neutral-300'
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
            {pickerTags.length > 0 && (
              <div className="scrollbar-none flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setPickerTagId(null)}
                  className={cn(
                    CHIP,
                    pickerTagId === null
                      ? 'bg-(--color-fg-strong) text-white'
                      : 'text-foreground bg-neutral-300'
                  )}
                >
                  전체
                </button>
                {pickerTags.map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      setPickerTagId(pickerTagId === t.id ? null : t.id)
                    }
                    className={cn(
                      CHIP,
                      pickerTagId === t.id
                        ? 'bg-(--color-fg-strong) text-white'
                        : 'text-foreground bg-neutral-300'
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 장소 목록 */}
          <div className="min-h-72 flex-1 overflow-y-auto px-5 pt-2 pb-6">
            <div className="flex flex-col gap-2">
              {!pickerLoaded ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-muted h-16 animate-pulse rounded-2xl"
                  />
                ))
              ) : filteredPickerPlaces.length === 0 ? (
                <p className="text-body-sm text-muted-foreground py-8 text-center">
                  등록된 장소가 없습니다.
                </p>
              ) : (
                filteredPickerPlaces.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPlacePickerOpen(false);
                      router.replace(`/reserve/${p.id}?date=${selectedDate}`);
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left shadow-(--shadow-1) transition-colors',
                      p.id === place.id
                        ? 'bg-primary/10'
                        : 'bg-card hover:bg-muted'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="text-foreground text-[15px] font-bold">
                        {p.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.floorName && (
                          <span className="text-muted-foreground rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium">
                            {p.floorName}
                          </span>
                        )}
                        {p.tags
                          .filter((t) => t.name)
                          .map((t, i) => (
                            <span
                              key={i}
                              className="text-muted-foreground rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium"
                            >
                              #{t.name}
                            </span>
                          ))}
                      </div>
                    </div>
                    {p.id === place.id && (
                      <span className="text-primary shrink-0 text-[11px] font-semibold">
                        현재
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 날짜 선택 Drawer */}
      <Drawer open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <DrawerContent className="bg-(--color-neutral-150)">
          <DrawerHeader>
            <DrawerTitle>날짜 선택</DrawerTitle>
          </DrawerHeader>
          <div className="bg-card mx-5 mb-4 rounded-2xl px-4 pb-6 shadow-(--shadow-1)">
            <WeeklyCalendar
              key={selectedDate}
              defaultDate={parseLocalDate(selectedDate) ?? new Date()}
              selectedDate={parseLocalDate(selectedDate) ?? undefined}
              onDateSelect={(date) => {
                setSelectedDate(formatLocalDate(date));
                setSelection({ startMin: 10 * 60, endMin: 11 * 60 });
                setDatePickerOpen(false);
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
