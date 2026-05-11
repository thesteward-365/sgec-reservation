'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

import {
  CalendarSyncHistoryDetail,
  type CalendarSyncHistoryDetailProps,
} from '@/components/admin/calendar-sync-history-detail';

type RunDetailResponse = {
  id: string;
  triggeredBy: 'manual' | 'system';
  startedAt: string;
  finishedAt: string | null;
  status: 'success' | 'partial' | 'failed';
  reservationSyncStatus: 'success' | 'failed' | 'skipped';
  eventSyncStatus: 'success' | 'failed' | 'skipped';
  counts: {
    reservationCreated: number;
    reservationUpdated: number;
    reservationDeleted: number;
    eventPulled: number;
    failed: number;
  };
  items: Array<{
    id: number;
    category: 'reservation' | 'event';
    action: 'created' | 'updated' | 'cancelled';
    status: 'success' | 'failed';
    reservationId: number | null;
    externalEventId: string | null;
    title: string;
    payload: Record<string, unknown> | null;
    errorMessage: string | null;
    processedAt: string;
  }>;
  logs: Array<{
    id: number;
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
};

function formatStartedAt(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatShortTime(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatFieldDateTime(value: string) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).formatToParts(new Date(value));

  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value ?? '';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';

  return `${month}.${day}(${weekday}) ${dayPeriod} ${hour}:${minute}`;
}

function formatDuration(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) return '-';
  const diffSec = Math.max(
    0,
    Math.floor(
      (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
    )
  );
  if (diffSec < 60) return `${diffSec}초`;
  const min = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  return sec === 0 ? `${min}분` : `${min}분 ${sec}초`;
}

function formatFieldValue(key: string, value: unknown) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' && value.trim() === '') return '-';

  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'from' in value &&
    'to' in value
  ) {
    const change = value as { from: unknown; to: unknown };
    return {
      previousValue:
        (key === 'startTime' || key === 'endTime') &&
        typeof change.from === 'string'
          ? formatFieldDateTime(change.from)
          : change.from === null ||
              change.from === undefined ||
              (typeof change.from === 'string' && change.from.trim() === '')
            ? '-'
            : String(change.from),
      value:
        (key === 'startTime' || key === 'endTime') && typeof change.to === 'string'
          ? formatFieldDateTime(change.to)
          : change.to === null ||
              change.to === undefined ||
              (typeof change.to === 'string' && change.to.trim() === '')
            ? '-'
            : String(change.to),
    };
  }

  if ((key === 'startTime' || key === 'endTime') && typeof value === 'string') {
    return { value: formatFieldDateTime(value) };
  }

  return { value: String(value) };
}

type ReservationFieldKey =
  | 'placeName'
  | 'purpose'
  | 'userName'
  | 'startTime'
  | 'endTime';

const reservationFieldOrder: Array<{
  key: ReservationFieldKey;
  label: string;
}> = [
  { key: 'placeName', label: '장소' },
  { key: 'purpose', label: '사용 목적' },
  { key: 'userName', label: '예약자' },
  { key: 'startTime', label: '시작' },
  { key: 'endTime', label: '종료' },
];

function hasPayloadKey(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function buildReservationFields(
  payload: Record<string, unknown>,
  action: 'created' | 'updated' | 'cancelled'
) {
  return reservationFieldOrder.flatMap(({ key, label }) => {
    if (action === 'updated' && !hasPayloadKey(payload, key)) {
      return [];
    }

    const formatted = formatFieldValue(key, payload[key]);
    return [
      {
        label,
        value: formatted.value,
        previousValue: formatted.previousValue,
      },
    ];
  });
}

function buildFields(
  payload: Record<string, unknown> | null,
  category: 'reservation' | 'event',
  action: 'created' | 'updated' | 'cancelled'
) {
  if (!payload) return [];

  if (category === 'reservation') {
    return buildReservationFields(payload, action);
  }

  return Object.entries(payload).flatMap(([key, value]) => {
    if (key === 'reservationId' || key === 'placeId' || key === 'userId') {
      return [];
    }
    if (value === null || value === undefined) return [];

    const labels: Record<string, string> = {
      userName: '예약자',
      placeName: '장소',
      title: '제목',
      purpose: '사용 목적',
      startTime: '시작',
      endTime: '종료',
      description: '설명',
      time: '시간',
      date: '날짜',
    };

    const label = labels[key] ?? key;
    const formatted = formatFieldValue(key, value);
    return [
      {
        label,
        value: formatted.value,
        previousValue: formatted.previousValue,
      },
    ];
  });
}

export default function CalendarSyncHistoryPage() {
  const params = useParams<{ runId: string }>();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<RunDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/calendar/history/${params.runId}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        if (!cancelled) setLoading(false);
        return;
      }

      const data = (await res.json()) as RunDetailResponse;
      if (!cancelled) {
        setDetail(data);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.runId]);

  const backHref = useMemo(() => {
    const candidate = searchParams.get('backHref');
    if (candidate && candidate.startsWith('/')) {
      return candidate;
    }
    return '/admin/calendar';
  }, [searchParams]);

  const viewProps = useMemo<CalendarSyncHistoryDetailProps | null>(() => {
    if (!detail) return null;

    const items = detail.items.map((item) => ({
      id: String(item.id),
      category: item.category,
      action: item.action,
      status: item.status,
      title: item.title,
      timeLabel: formatShortTime(item.processedAt),
      href: item.reservationId
        ? `/admin/reservations/${item.reservationId}`
        : undefined,
      fields: buildFields(item.payload, item.category, item.action),
    }));

    const logs = detail.logs.map((log) => ({
      id: `log-${log.id}`,
      level: log.level,
      timestampLabel: formatShortTime(log.timestamp),
      message: log.message,
    }));

    return {
      run: {
        status: detail.status,
        trigger: detail.triggeredBy,
        startedAtLabel: `${formatStartedAt(detail.startedAt)} 동기화`,
        durationLabel: formatDuration(detail.startedAt, detail.finishedAt),
        summary: {
          reservationSyncStatus: detail.reservationSyncStatus,
          eventSyncStatus: detail.eventSyncStatus,
        },
        items,
        logs,
      },
      selectedItemFilter:
        detail.eventSyncStatus === 'success' && detail.reservationSyncStatus !== 'success'
          ? 'reservation'
          : 'reservation',
      initialItemViewMode: 'summary',
      backHref,
    };
  }, [backHref, detail]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-(--color-neutral-150)">
        <ArrowPathIcon className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!viewProps) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-(--color-neutral-150)">
        <p className="text-muted-foreground text-body">동기화 이력을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return <CalendarSyncHistoryDetail {...viewProps} />;
}
