'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, getKSTToday } from '@/lib/utils';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface WeeklyCalendarProps {
  defaultDate?: Date;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onWeekChange?: (weekStart: Date) => void;
  /** 날짜에 예약 점 표시 여부를 반환하는 함수 */
  getIndicator?: (date: Date) => boolean;
  className?: string;
}

function WeeklyCalendar({
  defaultDate,
  selectedDate,
  onDateSelect,
  onWeekChange,
  getIndicator,
  className,
}: WeeklyCalendarProps) {
  const today = React.useMemo(() => {
    return getKSTToday();
  }, []);

  const [weekStart, setWeekStart] = React.useState(() =>
    startOfWeek(defaultDate ?? today)
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => {
    const next = addDays(weekStart, -7);
    setWeekStart(next);
    onWeekChange?.(next);
  };

  const handleNextWeek = () => {
    const next = addDays(weekStart, 7);
    setWeekStart(next);
    onWeekChange?.(next);
  };

  const weekLabel = React.useMemo(() => {
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getFullYear()}년 ${start.getMonth() + 1}월`;
    }
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 – ${end.getMonth() + 1}월`;
  }, [days]);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-2 py-2">
        <button
          onClick={handlePrevWeek}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm p-1.5 transition-colors duration-120 ease-(--ease-standard)"
          aria-label="이전 주"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-body-sm text-foreground font-semibold">
          {weekLabel}
        </span>
        <button
          onClick={handleNextWeek}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm p-1.5 transition-colors duration-120 ease-(--ease-standard)"
          aria-label="다음 주"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 py-2">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate
            ? isSameDay(day, selectedDate)
            : false;
          const isSunday = i === 0;
          const isSaturday = i === 6;
          const hasIndicator = getIndicator ? getIndicator(day) : false;

          const dayTextColor = isSunday
            ? 'text-(--color-danger)'
            : isSaturday
              ? 'text-primary'
              : 'text-muted-foreground';

          const dateTextColor = isSunday
            ? 'text-(--color-danger)'
            : isSaturday
              ? 'text-primary'
              : 'text-foreground';

          return (
            <button
              key={i}
              onClick={() => onDateSelect?.(day)}
              className="group flex items-center justify-center outline-none"
            >
              <div
                className={cn(
                  'relative flex w-10 flex-col items-center gap-1.5 rounded-md py-2.5 transition-colors duration-120 ease-(--ease-standard)',
                  isSelected ? 'bg-(--color-fg-strong)' : 'group-hover:bg-muted'
                )}
              >
                <span
                  className={cn(
                    'text-overline leading-none font-medium',
                    isSelected ? 'text-white/80' : dayTextColor
                  )}
                >
                  {DAY_LABELS[i]}
                </span>
                <span
                  className={cn(
                    'text-h5 leading-none',
                    isSelected
                      ? 'font-bold text-white'
                      : cn(dateTextColor, isToday ? 'font-bold' : 'font-medium')
                  )}
                >
                  {day.getDate()}
                </span>
                {hasIndicator && !isSelected && (
                  <span className="bg-primary absolute bottom-1.5 h-1 w-1 rounded-full" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { WeeklyCalendar };
export type { WeeklyCalendarProps };
