'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type Props = {
  selectedDate: Date;
  viewMonth: Date;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
  indicators?: Set<string>; // Set of 'YYYY-MM-DD' strings
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

export function MonthlyCalendar({
  selectedDate,
  viewMonth,
  onSelectDate,
  onChangeMonth,
  indicators,
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
    <div className="flex flex-col gap-3">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
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
      <div className="grid grid-cols-7 gap-x-0.5 gap-y-1">
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

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={cn(
                'group relative flex aspect-square items-center justify-center rounded-lg transition-colors',
                !inMonth && 'opacity-30',
                !isSel && 'hover:bg-neutral-100'
              )}
            >
              <span
                className={cn(
                  'relative flex size-9 items-center justify-center rounded-xl text-[14px] font-medium transition-colors',
                  isSel
                    ? 'bg-(--color-fg-strong) font-bold text-white'
                    : [
                        inMonth && dow === 0 && 'text-destructive',
                        inMonth && dow === 6 && 'text-primary',
                        !inMonth && 'text-muted-foreground',
                        inMonth && dow !== 0 && dow !== 6 && 'text-foreground',
                        isToday && !isSel && 'font-bold',
                      ]
                )}
              >
                {day.getDate()}
              </span>
              {hasIndicator && (
                <span className="bg-primary absolute bottom-1.5 size-1 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
