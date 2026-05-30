'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { List, ListItem } from '@/components/ui/list';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type CalendarStatus = {
  connected: boolean;
  needsReauth: boolean;
  email: string | null;
  calendarId: string | null;
  eventCalendarId: string | null;
  lastSync: string | null;
  pendingCount?: number;
  failedCount?: number;
};

type CalendarOption = { id: string; summary: string };
type SyncRunSummary = {
  id: string;
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
};

function getRunBadge(run: SyncRunSummary) {
  if (
    run.reservationSyncStatus === 'failed' ||
    run.eventSyncStatus === 'failed'
  ) {
    return { label: '실패', color: 'red' as const };
  }

  if (
    run.reservationSyncStatus === 'skipped' &&
    run.eventSyncStatus === 'skipped'
  ) {
    return { label: '변경 없음', color: 'neutral' as const };
  }

  return null;
}

function formatLastSync(iso: string | null): string {
  if (!iso) return '없음';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

function CalendarPageContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [selectedEventCalendar, setSelectedEventCalendar] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const [recentRuns, setRecentRuns] = useState<SyncRunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/admin/calendar', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setStatus(data);
      setSelectedCalendar(data.calendarId ?? '');
      setSelectedEventCalendar(data.eventCalendarId ?? '');
    }
  }, []);

  const fetchRecentRuns = useCallback(async () => {
    const res = await fetch('/api/admin/calendar/history?limit=10', {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      setRecentRuns(data.runs ?? []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchStatus();
      await fetchRecentRuns();
      setLoading(false);
    })();
  }, [fetchStatus, fetchRecentRuns]);

  useEffect(() => {
    if (!status?.connected) return;

    let cancelled = false;

    (async () => {
      const res = await fetch('/api/admin/calendar/calendars', {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) {
        setCalendars(data.calendars ?? []);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status?.connected]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected === 'true') {
      toast.success('Google 계정이 연결되었습니다!');
      queueMicrotask(() => {
        void fetchStatus();
        void fetchRecentRuns();
      });
    }
    if (error === 'access_denied') toast.error('Google 연동이 취소되었습니다.');
    if (error === 'token_error')
      toast.error('토큰 발급에 실패했습니다. 다시 시도해주세요.');
    if (error === 'callback_error') toast.error('연동 중 오류가 발생했습니다.');
  }, [fetchRecentRuns, fetchStatus, searchParams]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === 'success') {
          toast.success('동기화가 완료되었습니다.');
        } else {
          toast.error('동기화에 실패했습니다.');
        }
        await fetchStatus();
        await fetchRecentRuns();
      } else {
        toast.error(data.error ?? '동기화에 실패했습니다.');
      }
    } catch {
      toast.error('동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCalendars = async () => {
    if (!selectedCalendar || !selectedEventCalendar) {
      toast.error('두 캘린더를 모두 선택해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_calendars',
          calendarId: selectedCalendar,
          eventCalendarId: selectedEventCalendar,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        await fetchStatus();
      } else {
        toast.error(data.error ?? '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Google Calendar 연결을 해제하시겠습니까?')) return;
    try {
      const res = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                connected: false,
                email: null,
                calendarId: null,
                eventCalendarId: null,
              }
            : null
        );
        setCalendars([]);
      } else {
        toast.error(data.error ?? '연결 해제에 실패했습니다.');
      }
    } catch {
      toast.error('연결 해제 중 오류가 발생했습니다.');
    }
  };

  const calendarSaved = !!(status?.calendarId && status?.eventCalendarId);
  const calendarChanged =
    selectedCalendar !== (status?.calendarId ?? '') ||
    selectedEventCalendar !== (status?.eventCalendarId ?? '');

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          <Link
            href="/admin/dashboard"
            className="text-foreground flex size-10 items-center justify-center rounded-xl transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
          >
            <ChevronLeftIcon className="size-5 text-black" />
          </Link>
          <p className="text-body text-foreground flex-1 text-center font-bold!">
            Google Calendar 연동
          </p>
          <div className="size-10" />
        </div>
      </div>

      <main className="flex-1 pt-14 pb-10">
        <div className="space-y-4 px-5 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <ArrowPathIcon className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : !status?.connected ? (
            /* 미연결 상태 */
            <section className="space-y-2">
              <p className="text-caption text-muted-foreground px-1 font-bold">
                Google 계정
              </p>
              <Card className="flex flex-col items-center gap-4 p-8 text-center shadow-(--shadow-1)">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200">
                  <span className="text-foreground text-2xl font-bold">G</span>
                </div>
                <div>
                  <p className="text-body text-foreground font-bold">
                    Google 계정 미연결
                  </p>
                  <p className="text-caption text-muted-foreground mt-1">
                    Google 계정을 연결하면 예약 캘린더와 행사 일정 캘린더를
                    동기화할 수 있습니다.
                  </p>
                </div>
                <a href="/api/auth/google" className="w-full">
                  <Button className="bg-foreground text-background hover:bg-foreground/90 w-full font-bold">
                    Google로 연동하기
                  </Button>
                </a>
              </Card>
            </section>
          ) : (
            <>
              {/* 연결된 계정 */}
              <section className="space-y-2">
                <p className="text-caption text-muted-foreground px-1 font-bold">
                  Google 계정
                </p>

                {status.needsReauth && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 shadow-sm">
                    <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div className="flex-1">
                      <p className="text-[14px] leading-tight font-bold text-red-900">
                        연동 정보가 만료되었습니다
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-red-700">
                        보안 정책이나 비밀번호 변경으로 인해 Google 연결이
                        끊어졌습니다. 정상적인 동기화를 위해 다시 로그인이
                        필요합니다.
                      </p>
                      <a
                        href="/api/auth/google"
                        className="mt-3 inline-block rounded-full bg-red-600 px-4 py-1.5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-red-700"
                      >
                        다시 로그인하기
                      </a>
                    </div>
                  </div>
                )}

                <Card className="p-4 shadow-(--shadow-1)">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
                        <span className="text-foreground text-[17px] font-bold">
                          G
                        </span>
                      </div>
                      <div>
                        <p className="text-body text-foreground font-bold">
                          {status.email ?? '연결된 계정'}
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
                      onClick={handleDisconnect}
                    >
                      해제
                    </Button>
                  </div>
                </Card>
              </section>

              {/* 캘린더 선택 */}
              <section className="space-y-2">
                <p className="text-caption text-muted-foreground px-1 font-bold">
                  캘린더 설정
                </p>
                <Card className="space-y-4 p-5 shadow-(--shadow-1)">
                  <div className="space-y-2">
                    <label className="text-caption text-foreground font-bold">
                      예약 캘린더
                    </label>
                    <p className="text-caption text-muted-foreground">
                      장소 예약 내역을 관리하는 캘린더
                    </p>
                    <select
                      value={selectedCalendar}
                      onChange={(e) => setSelectedCalendar(e.target.value)}
                      className="border-border text-body text-foreground w-full rounded-sm border bg-white px-3 py-2 focus:ring-2 focus:ring-neutral-400 focus:outline-none"
                    >
                      <option value="">캘린더 선택</option>
                      {calendars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.summary}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-caption text-foreground font-bold">
                      행사 일정 캘린더
                    </label>
                    <p className="text-caption text-muted-foreground">
                      교회 행사 일정을 조회하는 캘린더 (읽기 전용)
                    </p>
                    <select
                      value={selectedEventCalendar}
                      onChange={(e) => setSelectedEventCalendar(e.target.value)}
                      className="border-border text-body text-foreground w-full rounded-sm border bg-white px-3 py-2 focus:ring-2 focus:ring-neutral-400 focus:outline-none"
                    >
                      <option value="">캘린더 선택</option>
                      {calendars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.summary}
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/admin/calendar/events"
                      className="text-caption inline-flex items-center font-semibold text-blue-600 hover:text-blue-700"
                    >
                      행사 일정 목록 보기
                    </Link>
                  </div>

                  <Button
                    onClick={handleSaveCalendars}
                    disabled={
                      isSaving ||
                      !selectedCalendar ||
                      !selectedEventCalendar ||
                      !calendarChanged
                    }
                    className="rounded-pill bg-foreground text-background hover:bg-foreground/90 w-full font-bold disabled:opacity-50"
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </Button>
                </Card>
              </section>

              {/* 동기화 안내 모달 */}
              <Dialog open={showSyncInfo} onOpenChange={setShowSyncInfo}>
                <DialogContent className="max-w-sm rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-body text-foreground font-bold">
                      동기화 대상 안내
                    </DialogTitle>
                  </DialogHeader>
                  <ul className="text-caption text-muted-foreground mt-1 space-y-4">
                    <li className="flex gap-3">
                      <span>
                        <span className="text-foreground font-semibold">
                          예약 → Google Calendar
                        </span>
                        <br />
                        예정된 예약을 Google Calendar에 등록합니다. 이미 올라간
                        예약도 최신 내용으로 업데이트됩니다.
                        <br />
                        {`(단, 이미 지나간 예약은 반영되지 않습니다.)`}
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span>
                        <span className="text-foreground font-semibold">
                          취소된 예약 삭제
                        </span>
                        <br />
                        자동으로 삭제되지 못한 Google Calendar 이벤트를
                        정리합니다.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span>
                        <span className="text-foreground font-semibold">
                          행사 일정 ← Google Calendar
                        </span>
                        <br />
                        앞으로 1년간의 행사 일정을 Google Calendar에서 가져와
                        예약 화면에 표시합니다.
                      </span>
                    </li>
                  </ul>
                </DialogContent>
              </Dialog>

              {/* 동기화 상태 */}
              {calendarSaved && (
                <section className="space-y-2">
                  <div className="flex items-center gap-1 px-1">
                    <p className="text-caption text-muted-foreground font-bold">
                      동기화 상태
                    </p>
                    <button
                      onClick={() => setShowSyncInfo(true)}
                      className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    >
                      <InformationCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <Card className="p-5 shadow-(--shadow-1)">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-1.5">
                          {(status.failedCount ?? 0) > 0 ? (
                            <>
                              <ExclamationCircleIcon className="text-red-500 h-4 w-4" />
                              <span className="text-body text-red-600 font-bold">
                                오류 {status.failedCount}건 발생
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="text-muted-foreground h-4 w-4" />
                              <span className="text-body text-foreground font-bold">
                                정상 동작 중
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-caption text-muted-foreground">
                          마지막 동기화: {formatLastSync(status.lastSync)}
                        </p>
                        <p className="text-caption text-muted-foreground mt-0.5">
                          대기 {status.pendingCount ?? 0}건 · 실패 {status.failedCount ?? 0}건
                        </p>
                      </div>
                      <Button
                        onClick={handleSync}
                        disabled={isSyncing}
                        size="sm"
                        className="rounded-pill bg-foreground text-background hover:bg-foreground/90 font-bold"
                      >
                        <ArrowPathIcon
                          className={`mr-1 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
                        />
                        {isSyncing ? '동기화중' : '전체 동기화'}
                      </Button>
                    </div>
                  </Card>
                </section>
              )}

              {calendarSaved && (
                <section className="space-y-2">
                  <p className="text-caption text-muted-foreground px-1 font-bold">
                    최근 동기화 이력
                  </p>
                  <List emptyMessage="최근 동기화 이력이 없습니다.">
                    {recentRuns.map((run) => {
                      const badge = getRunBadge(run);

                      return (
                        <ListItem key={run.id} className="p-0">
                          <Link
                            href={`/admin/calendar/history/${run.id}`}
                            className="text-foreground block px-5 py-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <p className="text-body text-foreground min-w-0 truncate font-bold">
                                  {formatLastSync(run.startedAt)}
                                </p>
                                {badge ? (
                                  <Badge
                                    color={badge.color}
                                    className="shrink-0"
                                  >
                                    {badge.label}
                                  </Badge>
                                ) : null}
                              </div>
                              <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                            </div>
                          </Link>
                        </ListItem>
                      );
                    })}
                  </List>
                </section>
              )}

              {/* 캘린더 미설정 경고 */}
              {!calendarSaved && (
                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3">
                  <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-caption text-amber-700">
                    캘린더를 선택하고 저장해야 예약 동기화가 시작됩니다.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarPageContent />
    </Suspense>
  );
}
