'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

import { Card } from '@/components/ui/card';

type ExternalEventResponse = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  description: string | null;
};

function toMonthParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

function formatDateLabel(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(iso));
}

function formatTimeRange(event: ExternalEventResponse) {
  if (event.isAllDay) return '종일';

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const startLabel = new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);
  const endLabel = new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}

export default function AdminCalendarEventsPage() {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<ExternalEventResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/external-events?month=${toMonthParam(viewMonth)}`,
          {
            cache: 'no-store',
          }
        );
        const data = (await res.json()) as ExternalEventResponse[];
        if (!cancelled) {
          setEvents(data ?? []);
        }
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewMonth]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, ExternalEventResponse[]>();

    for (const event of events) {
      const key = event.startTime.slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  return (
    <div className="min-h-dvh bg-(--color-neutral-150)">
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          <Link
            href="/admin/calendar"
            className="text-foreground flex size-10 items-center justify-center rounded-xl transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
          >
            <ChevronLeftIcon className="size-5 text-black" />
          </Link>
          <p className="text-body text-foreground flex-1 text-center font-bold!">
            행사 일정 목록
          </p>
          <div className="size-10" />
        </div>
      </div>

      <main className="mx-auto flex max-w-107.5 flex-col gap-4 px-5 pt-18 pb-8">
        <Card className="gap-4 rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
                )
              }
              className="text-foreground flex size-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
              aria-label="이전 달"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <div className="text-center">
              <p className="text-foreground text-lg font-bold">
                {formatMonthLabel(viewMonth)}
              </p>
              <p className="text-muted-foreground text-caption mt-1">
                Google 행사 일정 캘린더 기준
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
                )
              }
              className="text-foreground flex size-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
              aria-label="다음 달"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <ArrowPathIcon className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : groupedEvents.length === 0 ? (
          <div className="bg-card rounded-xl px-4 py-10 text-center shadow-(--shadow-1)">
            <p className="text-foreground text-[15px] font-semibold">
              이 달의 행사 일정이 없습니다
            </p>
          </div>
        ) : (
          groupedEvents.map(([date, dayEvents]) => (
            <section key={date} className="space-y-2">
              <p className="text-caption text-muted-foreground px-1 font-bold">
                {formatDateLabel(date)}
              </p>
              <div className="space-y-3">
                {dayEvents.map((event) => (
                  <Card key={event.id} className="gap-3 p-5 shadow-(--shadow-1)">
                    <div className="space-y-1">
                      <p className="text-foreground text-base font-bold">
                        {event.title}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {formatTimeRange(event)}
                      </p>
                    </div>
                    {event.description ? (
                      <p className="text-body text-muted-foreground whitespace-pre-wrap">
                        {event.description}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
