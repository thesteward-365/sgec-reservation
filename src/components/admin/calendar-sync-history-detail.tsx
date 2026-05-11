'use client';

import { useState } from 'react';
import {
  ChevronLeftIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';

type SyncStatus = 'success' | 'partial' | 'failed';
type SyncTrigger = 'manual' | 'system';
type SyncItemStatus = 'success' | 'failed';
type SyncItemCategory = 'reservation' | 'event';
type SyncItemAction = 'created' | 'updated' | 'cancelled';
type LogLevel = 'info' | 'warning' | 'error';
type CalendarResultStatus = 'success' | 'skipped' | 'failed';
type ItemFilterKey = 'reservation' | 'event';
type ItemViewMode = 'title' | 'summary';

export type CalendarSyncItemField = {
  label: string;
  value: string;
  previousValue?: string;
};

export type CalendarSyncItem = {
  id: string;
  category: SyncItemCategory;
  status: SyncItemStatus;
  action: SyncItemAction;
  title: string;
  timeLabel: string;
  fields: CalendarSyncItemField[];
  href?: string;
};

export type CalendarSyncLog = {
  id: string;
  level: LogLevel;
  timestampLabel: string;
  message: string;
};

export type CalendarSyncHistoryDetailProps = {
  run: {
    status: SyncStatus;
    trigger: SyncTrigger;
    startedAtLabel: string;
    durationLabel: string;
    summary: {
      reservationSyncStatus: CalendarResultStatus;
      eventSyncStatus: CalendarResultStatus;
    };
    items: CalendarSyncItem[];
    logs: CalendarSyncLog[];
  };
  selectedItemFilter?: ItemFilterKey;
  initialItemViewMode?: ItemViewMode;
  backHref?: string;
};

const statusBadgeMap = {
  success: { label: '성공', color: 'green' as const },
  partial: { label: '부분 실패', color: 'orange' as const },
  failed: { label: '실패', color: 'red' as const },
};

const resultStatusMap = {
  success: { label: '성공', color: 'green' as const },
  skipped: { label: '변경 없음', color: 'neutral' as const },
  failed: { label: '실패', color: 'red' as const },
};

const logBadgeMap = {
  info: { label: '정보', color: 'blue' as const },
  warning: { label: '경고', color: 'orange' as const },
  error: { label: '오류', color: 'red' as const },
};

const itemFilterOptions: { key: ItemFilterKey; label: string }[] = [
  { key: 'reservation', label: '예약' },
  { key: 'event', label: '행사' },
];

function getTriggerLabel(trigger: SyncTrigger) {
  return trigger === 'manual' ? '수동 실행' : '자동 실행';
}

function getActionLabel(action: SyncItemAction) {
  switch (action) {
    case 'created':
      return '생성';
    case 'updated':
      return '수정';
    case 'cancelled':
      return '취소';
  }
}

function getActionTone(action: SyncItemAction, status: SyncItemStatus) {
  if (status === 'failed') return 'bg-red-500';

  switch (action) {
    case 'created':
      return 'bg-green-500';
    case 'updated':
      return 'bg-blue-500';
    case 'cancelled':
      return 'bg-red-500';
  }
}

export function CalendarSyncHistoryDetail({
  run,
  selectedItemFilter = 'reservation',
  initialItemViewMode = 'summary',
  backHref = '/admin/calendar',
}: CalendarSyncHistoryDetailProps) {
  const statusMeta = statusBadgeMap[run.status];
  const [activeFilter, setActiveFilter] = useState<ItemFilterKey>(selectedItemFilter);
  const [itemViewMode, setItemViewMode] =
    useState<ItemViewMode>(initialItemViewMode);
  const filteredItems = run.items.filter((item) => item.category === activeFilter);
  const reservationStatus = resultStatusMap[run.summary.reservationSyncStatus];
  const eventStatus = resultStatusMap[run.summary.eventSyncStatus];

  return (
    <div className="min-h-dvh bg-(--color-neutral-150)">
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          <Link
            href={backHref}
            className="text-foreground flex size-10 items-center justify-center rounded-xl transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
          >
            <ChevronLeftIcon className="size-5 text-black" />
          </Link>
          <p className="text-body text-foreground flex-1 text-center font-bold!">
            동기화 이력
          </p>
          <div className="size-10" />
        </div>
      </div>

      <main className="mx-auto flex max-w-107.5 flex-1 flex-col gap-4 px-5 pt-18 pb-8">
        <Card className="gap-4 rounded-[28px] p-5">
          <div className="flex items-center gap-2">
            <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
            <Badge variant="outline">{getTriggerLabel(run.trigger)}</Badge>
          </div>

          <div className="space-y-1">
            <p className="text-h4 text-foreground font-bold tracking-[-0.02em]">
              {run.startedAtLabel}
            </p>
            <p className="text-caption text-muted-foreground">
              {run.durationLabel} 소요
            </p>
          </div>

          <div className="space-y-3 border-t border-neutral-100 pt-4">
            <SummaryResultButton
              label="예약 캘린더 동기화"
              statusLabel={reservationStatus.label}
              statusColor={reservationStatus.color}
              active={activeFilter === 'reservation'}
              onClick={() => setActiveFilter('reservation')}
            />
            <SummaryResultButton
              label="행사 캘린더 동기화"
              statusLabel={eventStatus.label}
              statusColor={eventStatus.color}
              active={activeFilter === 'event'}
              onClick={() => setActiveFilter('event')}
            />
          </div>
        </Card>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-caption text-muted-foreground font-bold">
              처리된 항목
            </p>
            <p className="text-muted-foreground text-[12px] font-semibold">
              {filteredItems.length}개 항목
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <div className="flex gap-2 overflow-x-auto">
              {itemFilterOptions.map((filter) => (
                <Chip
                  key={filter.key}
                  variant={activeFilter === filter.key ? 'active' : 'inactive'}
                  size="sm"
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </Chip>
              ))}
            </div>

            <button
              type="button"
              aria-label={
                itemViewMode === 'summary' ? '요약형 보기 해제' : '요약형 보기'
              }
              aria-pressed={itemViewMode === 'summary'}
              onClick={() =>
                setItemViewMode((prev) =>
                  prev === 'summary' ? 'title' : 'summary'
                )
              }
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                itemViewMode === 'summary'
                  ? 'bg-foreground text-background'
                  : 'bg-neutral-200 text-muted-foreground hover:text-foreground'
              )}
            >
              <QueueListIcon className="size-4" />
            </button>
          </div>

          <div className="space-y-3">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <SyncHistoryListItem
                  key={item.id}
                  item={item}
                  compact={itemViewMode === 'title'}
                />
              ))
            ) : (
              <div className="bg-card rounded-xl px-4 py-10 text-center shadow-(--shadow-1)">
                <p className="text-foreground text-[15px] font-semibold">
                  처리된 항목이 없습니다
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-caption text-muted-foreground px-1 font-bold">
            오류 및 로그
          </p>
          <div className="space-y-3">
            {run.logs.length > 0 ? (
              run.logs.map((log) => {
                const badge = logBadgeMap[log.level];

                return (
                  <Card key={log.id} className="gap-2 p-4">
                    <div className="flex items-center gap-2">
                      <Badge color={badge.color}>{badge.label}</Badge>
                      <span className="text-caption text-muted-foreground">
                        {log.timestampLabel}
                      </span>
                    </div>
                    <p className="text-body text-foreground leading-6">
                      {log.message}
                    </p>
                  </Card>
                );
              })
            ) : (
              <div className="bg-card rounded-xl px-4 py-10 text-center shadow-(--shadow-1)">
                <p className="text-foreground text-[15px] font-semibold">
                  표시할 로그가 없습니다
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryResultButton({
  label,
  statusLabel,
  statusColor,
  active,
  onClick,
}: {
  label: string;
  statusLabel: string;
  statusColor: 'green' | 'red';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors',
        active ? 'bg-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200'
      )}
    >
      <div>
        <p className="text-muted-foreground text-[12px] font-semibold">
          {label}
        </p>
        <p className="text-foreground mt-1 text-[15px] font-bold">
          {statusLabel}
        </p>
      </div>
      <Badge color={statusColor}>{statusLabel}</Badge>
    </button>
  );
}

function SyncHistoryListItem({
  item,
  compact,
}: {
  item: CalendarSyncItem;
  compact: boolean;
}) {
  const content = (
    <div className="text-foreground rounded-2xl bg-white p-4 shadow-(--shadow-1)">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-body">
          <span
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white',
              getActionTone(item.action, item.status)
            )}
          >
            {getActionLabel(item.action)}
          </span>
          <span className="font-bold truncate">{item.title}</span>
        </div>
        <span className="text-caption text-muted-foreground ml-2 shrink-0">
          {item.timeLabel}
        </span>
      </div>

      {!compact ? (
        <div className="space-y-1.5 border-t border-neutral-50 pt-3">
          {item.fields.map((field) => (
            <div key={`${field.label}-${field.value}`} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-16 shrink-0 font-medium">
                {field.label}
              </span>
              {field.previousValue !== undefined ? (
                <div className="flex flex-1 items-center gap-2 overflow-hidden text-[13px]">
                  <span className="truncate opacity-40 line-through">
                    {field.previousValue}
                  </span>
                  <span className="opacity-30">→</span>
                  <span className="truncate font-semibold text-blue-600">
                    {field.value}
                  </span>
                </div>
              ) : (
                <span className="truncate text-[13px] font-semibold">
                  {field.value}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (!item.href) return content;

  return (
    <Link href={item.href} className="text-foreground block">
      {content}
    </Link>
  );
}
