'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { cn, getKSTToday } from '@/lib/utils';
import { useState, useMemo } from 'react';

export type CalendarEvent = {
  id: string | number;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  variant?: 'primary' | 'secondary' | 'accent' | 'info';
};

type Props = {
  selectedDate: Date;
  viewMonth: Date;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
  indicators?: Set<string>; // Set of 'YYYY-MM-DD' strings
  events?: CalendarEvent[];
  showEvents?: boolean;
  today?: Date;
  defaultExpanded?: boolean;
};

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const EVENT_VARIANTS = {
  primary: 'bg-primary/10 text-primary-foreground',
  secondary: 'bg-amber-100/50 text-amber-900',
  accent: 'bg-indigo-50 text-indigo-900',
  info: 'bg-emerald-50 text-emerald-900',
};

export function MonthlyCalendar({
  selectedDate,
  viewMonth,
  onSelectDate,
  onChangeMonth,
  indicators,
  events = [],
  showEvents = true,
  today = getKSTToday(),
  defaultExpanded = false,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // 그리드 생성 (각 주가 적어도 하루의 해당 월 날짜를 포함하도록 동적 크기 계산)
  const days = useMemo(() => {
    const firstOfMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1
    );
    const startOfGrid = new Date(firstOfMonth);
    startOfGrid.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    const daysInMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      0
    ).getDate();
    const gridLength = Math.ceil((firstOfMonth.getDay() + daysInMonth) / 7) * 7;

    return Array.from({ length: gridLength }, (_, i) => {
      const d = new Date(startOfGrid);
      d.setDate(startOfGrid.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  // 선택된 날짜가 포함된 주(Row) 계산
  const selectedWeekIndex = useMemo(() => {
    const index = days.findIndex((d) => isSameDay(d, selectedDate));
    return index === -1 ? 0 : Math.floor(index / 7);
  }, [days, selectedDate]);

  // 표시할 날짜 결정 (전체 42일 vs 선택된 주 7일)
  const displayDays = isExpanded
    ? days
    : days.slice(selectedWeekIndex * 7, (selectedWeekIndex + 1) * 7);

  // 상단 월 레이블
  const monthLabel = useMemo(() => {
    const targetDate = isExpanded ? viewMonth : selectedDate;
    return targetDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
    });
  }, [isExpanded, viewMonth, selectedDate]);

  // 네비게이션 처리
  function handlePrev() {
    if (isExpanded) {
      onChangeMonth(
        new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
      );
    } else {
      const prevDate = new Date(selectedDate);
      prevDate.setDate(selectedDate.getDate() - 7);
      onSelectDate(prevDate);
      if (prevDate.getMonth() !== selectedDate.getMonth()) {
        onChangeMonth(new Date(prevDate.getFullYear(), prevDate.getMonth(), 1));
      }
    }
  }

  function handleNext() {
    if (isExpanded) {
      onChangeMonth(
        new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
      );
    } else {
      const nextDate = new Date(selectedDate);
      nextDate.setDate(selectedDate.getDate() + 7);
      onSelectDate(nextDate);
      if (nextDate.getMonth() !== selectedDate.getMonth()) {
        onChangeMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      }
    }
  }

  function goToday() {
    const next = new Date(today);
    onSelectDate(next);
    onChangeMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {/* 캘린더 헤더: 토글 + 네비게이션 */}
      <div className="mb-1 flex items-center justify-between">
        {/* 좌측: 연월 표시 (토글 버튼) 및 오늘 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="-ml-1 flex items-center gap-1.5 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-neutral-100 active:bg-neutral-200"
            aria-label={isExpanded ? '달력 접기' : '달력 펼치기'}
          >
            <span className="text-foreground text-[18px] font-bold tracking-tight">
              {monthLabel}
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="text-muted-foreground size-4 stroke-[3]" />
            ) : (
              <ChevronDownIcon className="text-muted-foreground size-4 stroke-[3]" />
            )}
          </button>

          <button
            type="button"
            onClick={goToday}
            className="text-primary hover:bg-primary/5 rounded-full bg-neutral-50 px-2.5 py-0.5 text-[12px] font-bold transition-colors"
          >
            오늘
          </button>
        </div>

        {/* 우측: 이전/다음 네비게이션 버튼 (터치 영역 확장 및 시각적 구분) */}
        <div className="flex items-center">
          <button
            onClick={handlePrev}
            className="flex items-center justify-center rounded-full p-3 transition-colors hover:bg-neutral-100 active:bg-neutral-200"
            aria-label="이전"
          >
            <ChevronLeftIcon className="text-foreground size-5 stroke-[2.5]" />
          </button>
          <div className="mx-1 h-4 w-px bg-neutral-200" aria-hidden="true" />
          <button
            onClick={handleNext}
            className="flex items-center justify-center rounded-full p-3 transition-colors hover:bg-neutral-100 active:bg-neutral-200"
            aria-label="다음"
          >
            <ChevronRightIcon className="text-foreground size-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-x-0 gap-y-1">
        {DOW_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'py-1 text-center text-[11px] font-medium',
              i === 0
                ? 'text-destructive'
                : i === 6
                  ? 'text-primary'
                  : 'text-muted-foreground'
            )}
          >
            {label}
          </div>
        ))}

        {displayDays.map((day, i) => {
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const isActiveDay = isExpanded ? inMonth : true;
          const isSel = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const ymd = toYMD(day);
          const hasIndicator = isActiveDay && indicators?.has(ymd) && !isSel;
          const dow = day.getDay();

          const dayEvents = showEvents
            ? events
                .filter((e) => ymd >= e.startDate && ymd <= e.endDate)
                .sort((a, b) => String(a.id).localeCompare(String(b.id)))
            : [];

          return (
            <button
              key={ymd + '-' + i}
              onClick={() => onSelectDate(day)}
              className={cn(
                'group relative flex aspect-square flex-col items-center justify-center rounded-lg transition-colors',
                !isActiveDay && 'opacity-30'
              )}
            >
              {/* 이벤트 배경 */}
              <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center justify-center gap-0.5 px-0">
                {dayEvents.map((event) => {
                  const isStart = ymd === event.startDate || dow === 0;
                  const isEnd = ymd === event.endDate || dow === 6;
                  const isSingleDay = event.startDate === event.endDate;

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'flex h-9 items-center justify-center transition-all',
                        EVENT_VARIANTS[event.variant || 'primary'],
                        isSingleDay
                          ? 'aspect-square rounded-full'
                          : [
                              'w-full',
                              isStart && 'ml-1 rounded-l-full',
                              isEnd && 'mr-1 rounded-r-full',
                              !isStart && !isEnd && 'mx-0',
                            ]
                      )}
                    />
                  );
                })}
              </div>

              <span
                className={cn(
                  'relative z-10 flex size-8 items-center justify-center rounded-full text-[14px] font-medium transition-colors',
                  isSel
                    ? 'bg-(--color-fg-strong) font-bold text-white shadow-sm'
                    : [
                        'group-hover:bg-neutral-100 group-focus:bg-neutral-100',
                        isActiveDay && dow === 0 && 'text-destructive',
                        isActiveDay && dow === 6 && 'text-primary',
                        !isActiveDay && 'text-muted-foreground',
                        isActiveDay &&
                          dow !== 0 &&
                          dow !== 6 &&
                          'text-foreground',
                        isToday &&
                          !isSel &&
                          'bg-blue-100 font-bold ring-1 ring-blue-100',
                        dayEvents.length > 0 && 'font-bold',
                      ]
                )}
              >
                {day.getDate()}
              </span>

              {hasIndicator && (
                <div className="absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2">
                  <span className="bg-primary block size-1 rounded-full shadow-[0_0_2px_white]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
