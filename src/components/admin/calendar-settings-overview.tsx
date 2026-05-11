'use client';

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';

type RecentSyncStatus = 'success' | 'failed';

export type RecentSyncHistory = {
  id: string;
  startedAtLabel: string;
  relativeTimeLabel: string;
  reservationStatus: RecentSyncStatus;
  eventStatus: RecentSyncStatus;
  href: string;
};

export type CalendarSettingsOverviewProps = {
  connection: {
    email: string;
    reservationCalendarName: string;
    eventCalendarName: string;
    lastSyncLabel: string;
  };
  recentHistories: RecentSyncHistory[];
};

export function CalendarSettingsOverview({
  connection,
  recentHistories,
}: CalendarSettingsOverviewProps) {
  return (
    <div className="min-h-dvh bg-(--color-neutral-150)">
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          <Link
            href="/admin/dashboard"
            className="text-foreground flex size-10 items-center justify-center rounded-xl no-underline transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200 hover:no-underline"
          >
            <ChevronLeftIcon className="size-5 text-black" />
          </Link>
          <p className="text-body text-foreground flex-1 text-center font-bold!">
            Google Calendar 연동
          </p>
          <div className="size-10" />
        </div>
      </div>

      <main className="mx-auto flex max-w-107.5 flex-1 flex-col gap-4 px-5 pt-18 pb-8">
        <section className="space-y-2">
          <p className="text-caption text-muted-foreground px-1 font-bold">
            Google 계정
          </p>
          <Card className="p-4 shadow-(--shadow-1)">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
                  <span className="text-foreground text-[17px] font-bold">
                    G
                  </span>
                </div>
                <div>
                  <p className="text-body text-foreground font-bold">
                    {connection.email}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <CheckCircleIcon className="text-muted-foreground h-4 w-4" />
                    <span className="text-caption text-muted-foreground font-semibold">
                      연결됨
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="text-foreground h-8 border-none bg-neutral-200 px-3 text-[13px] font-bold hover:bg-neutral-300"
              >
                해제
              </Button>
            </div>
          </Card>
        </section>

        <section className="space-y-2">
          <p className="text-caption text-muted-foreground px-1 font-bold">
            캘린더 설정
          </p>
          <Card className="space-y-4 p-5 shadow-(--shadow-1)">
            <CalendarRow
              label="예약 캘린더"
              value={connection.reservationCalendarName}
            />
            <CalendarRow
              label="행사 일정 캘린더"
              value={connection.eventCalendarName}
            />
            <Button className="rounded-pill bg-foreground text-background hover:bg-foreground/90 w-full font-bold">
              저장
            </Button>
          </Card>
        </section>

        <section className="space-y-2">
          <p className="text-caption text-muted-foreground px-1 font-bold">
            동기화 상태
          </p>
          <Card className="p-5 shadow-(--shadow-1)">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-1.5">
                  <CheckCircleIcon className="text-muted-foreground h-4 w-4" />
                  <span className="text-body text-foreground font-bold">
                    정상 동작 중
                  </span>
                </div>
                <p className="text-caption text-muted-foreground">
                  마지막 동기화: {connection.lastSyncLabel}
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-pill bg-foreground text-background hover:bg-foreground/90 font-bold"
              >
                <ArrowPathIcon className="mr-1 h-4 w-4" />
                동기화
              </Button>
            </div>
          </Card>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-caption text-muted-foreground font-bold">
              최근 동기화 이력
            </p>
          </div>

          <List emptyMessage="최근 동기화 이력이 없습니다.">
            {recentHistories.map((history) => (
              <ListItem key={history.id} className="p-0">
                <Link
                  href={history.href}
                  className="block px-5 py-4 no-underline hover:no-underline"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body text-foreground min-w-0 truncate font-bold">
                          {history.startedAtLabel}
                        </p>
                        {hasFailure(history) ? (
                          <Badge color="red" className="shrink-0">
                            실패
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-caption text-muted-foreground mt-1">
                        {history.relativeTimeLabel}
                      </p>
                    </div>
                    <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                  </div>
                </Link>
              </ListItem>
            ))}
          </List>
        </section>
      </main>
    </div>
  );
}

function CalendarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-caption text-muted-foreground font-bold">{label}</p>
      <div className="rounded-2xl bg-neutral-100 px-4 py-3">
        <p className="text-body text-foreground font-bold">{value}</p>
      </div>
    </div>
  );
}

function hasFailure(history: RecentSyncHistory) {
  return (
    history.reservationStatus === 'failed' || history.eventStatus === 'failed'
  );
}
