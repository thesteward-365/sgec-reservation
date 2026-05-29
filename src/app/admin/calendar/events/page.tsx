'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { Card } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import {
  getExternalEventDateRange,
  isExternalEventAllDay,
} from '@/lib/external-event-dates';

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

function formatKstTime(iso: string) {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function EventDateSide({ event }: { event: ExternalEventResponse }) {
  const { startDate, endDate } = getExternalEventDateRange(event);
  const start = new Date(event.startTime);
  const isAllDay = isExternalEventAllDay(event);
  const isMultiDay = startDate !== endDate;

  const day = start.getDate();
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(
    start
  );

  return (
    <div className="flex min-w-16 flex-col items-center justify-center rounded-lg bg-neutral-50 px-3 py-2 text-center">
      <span className="text-foreground text-[18px] font-bold tabular-nums">
        {day}
      </span>
      <span className="text-muted-foreground text-[12px] font-medium">
        {weekday}
      </span>
    </div>
  );
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

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
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
                월별 행사 일정
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
          <ListSkeleton count={5} />
        ) : sortedEvents.length === 0 ? (
          <div className="bg-card rounded-xl px-4 py-10 text-center shadow-(--shadow-1)">
            <p className="text-foreground text-[15px] font-semibold">
              이 달의 행사 일정이 없습니다
            </p>
          </div>
        ) : (
          <div className="bg-card overflow-hidden rounded-xl shadow-(--shadow-1)">
            <List>
              {sortedEvents.map((event) => {
                const { startDate, endDate } = getExternalEventDateRange(event);
                const isAllDay = isExternalEventAllDay(event);
                const isMultiDay = startDate !== endDate;

                return (
                  <ListItem key={event.id} className="p-0">
                    <div className="flex w-full items-start gap-4 px-4 py-4">
                      <EventDateSide event={event} />
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-foreground text-base leading-tight font-bold">
                          {event.title}
                        </p>
                        {event.description ? (
                          <p className="text-muted-foreground mt-1.5 line-clamp-2 text-[14px] leading-snug whitespace-pre-wrap">
                            {event.description}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground mt-2 text-[12px]">
                          {new Intl.DateTimeFormat('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                            hour: isAllDay ? undefined : 'numeric',
                            minute: isAllDay ? undefined : '2-digit',
                          }).format(new Date(event.startTime))}
                          {isMultiDay && (
                            <>
                              {' '}
                              ~{' '}
                              {new Intl.DateTimeFormat('ko-KR', {
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short',
                              }).format(new Date(event.endTime))}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </ListItem>
                );
              })}
            </List>
          </div>
        )}
      </main>
    </div>
  );
}
