"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface WeeklyCalendarProps {
  defaultDate?: Date
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  className?: string
}

function WeeklyCalendar({
  defaultDate,
  selectedDate,
  onDateSelect,
  className,
}: WeeklyCalendarProps) {
  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [weekStart, setWeekStart] = React.useState(() =>
    startOfWeek(defaultDate ?? today)
  )

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const weekLabel = React.useMemo(() => {
    const start = days[0]
    const end = days[6]
    if (start.getMonth() === end.getMonth()) {
      return `${start.getFullYear()}년 ${start.getMonth() + 1}월`
    }
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 – ${end.getMonth() + 1}월`
  }, [days])

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between px-2 py-2">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-120 ease-(--ease-standard)"
          aria-label="이전 주"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-caption font-semibold text-foreground">
          {weekLabel}
        </span>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-120 ease-(--ease-standard)"
          aria-label="다음 주"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const isSunday = i === 0
          const isSaturday = i === 6

          return (
            <button
              key={i}
              onClick={() => onDateSelect?.(day)}
              className="flex flex-col items-center gap-1 py-2 outline-none"
            >
              <span
                className={cn(
                  "text-overline font-semibold leading-none",
                  isSunday
                    ? "text-(--color-danger)"
                    : isSaturday
                      ? "text-primary"
                      : "text-muted-foreground"
                )}
              >
                {DAY_LABELS[i]}
              </span>
              <span
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-pill text-body-sm transition-colors duration-120 ease-(--ease-standard)",
                  isSelected
                    ? "bg-primary text-white font-semibold"
                    : isToday
                      ? "bg-accent text-accent-foreground font-semibold"
                      : isSunday
                        ? "text-(--color-danger) hover:bg-muted"
                        : isSaturday
                          ? "text-primary hover:bg-muted"
                          : "text-foreground hover:bg-muted"
                )}
              >
                {day.getDate()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { WeeklyCalendar }
