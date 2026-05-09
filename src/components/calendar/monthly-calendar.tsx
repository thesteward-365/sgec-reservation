'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

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
}: Props) {
  const today = new Date();

  const firstOfMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1
  );
  // Sunday-based week start
  const startOfGrid = new Date(firstOfMonth);
  startOfGrid.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startOfGrid);
    d.setDate(startOfGrid.getDate() + i);
    return d;
  });

  const monthLabel = viewMonth.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  function prevMonth() {
    onChangeMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
    );
  }
  function nextMonth() {
    onChangeMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
      {/* 월 네비게이션 */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-neutral-100"
          aria-label="이전 달"
        >
          <ChevronLeftIcon className="text-foreground size-5" />
        </button>
        <span className="text-foreground text-[16px] font-bold">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-neutral-100"
          aria-label="다음 달"
        >
          <ChevronRightIcon className="text-foreground size-5" />
        </button>
      </div>

      {/* 요일 헤더 + 날짜 셀 */}
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

        {days.map((day, i) => {
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const isSel = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const ymd = toYMD(day);
          const hasIndicator = inMonth && indicators?.has(ymd) && !isSel;
          const dow = day.getDay();

          // 해당 날짜의 이벤트들
          // ID 순으로 정렬하여 여러 날짜에 걸쳐 있을 때 수직 위치(Lane)를 고정함
          const dayEvents = showEvents
            ? events
                .filter((e) => ymd >= e.startDate && ymd <= e.endDate)
                .sort((a, b) => String(a.id).localeCompare(String(b.id)))
            : [];

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={cn(
                'group relative flex aspect-square flex-col items-center justify-center rounded-lg transition-colors',
                !inMonth && 'opacity-30',
                !isSel && 'hover:bg-neutral-100'
              )}
            >
              {/* 이벤트 파스텔 배경 레이어 (필/원 형태) */}
              <div className="absolute inset-x-0 flex flex-col items-center justify-center gap-0.5 px-0">
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
                          ? 'aspect-square rounded-full' // 단일 일정: 원형
                          : [
                              'w-full',
                              isStart && 'ml-1 rounded-l-full', // 시작: 왼쪽 둥글게 + 여백
                              isEnd && 'mr-1 rounded-r-full', // 종료: 오른쪽 둥글게 + 여백
                              !isStart && !isEnd && 'mx-0', // 중간: 꽉 찬 사각형
                            ]
                      )}
                    />
                  );
                })}
              </div>

              <span
                className={cn(
                  'relative z-10 flex size-8 items-center justify-center text-[14px] font-medium transition-colors',
                  isSel
                    ? 'rounded-full bg-(--color-fg-strong) font-bold text-white shadow-sm' // 선택 시 원형
                    : [
                        inMonth && dow === 0 && 'text-destructive',
                        inMonth && dow === 6 && 'text-primary',
                        !inMonth && 'text-muted-foreground',
                        inMonth && dow !== 0 && dow !== 6 && 'text-foreground',
                        isToday && !isSel && 'font-bold',
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
