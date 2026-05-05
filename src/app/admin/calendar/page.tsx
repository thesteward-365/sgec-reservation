'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from '@heroicons/react/24/outline';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type CalendarStatus = {
  connected: boolean;
  email: string | null;
  calendarId: string | null;
  eventCalendarId: string | null;
  lastSync: string | null;
};

type CalendarOption = { id: string; summary: string };

function formatLastSync(iso: string | null): string {
  if (!iso) return '없음';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}분 전`;
  return `${Math.floor(diffMin / 60)}시간 전`;
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
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/admin/calendar');
    if (res.ok) {
      const data = await res.json();
      setStatus(data);
    }
  }, []);

  const fetchCalendars = useCallback(async () => {
    const res = await fetch('/api/admin/calendar/calendars');
    if (res.ok) {
      const data = await res.json();
      setCalendars(data.calendars ?? []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchStatus();
      setLoading(false);
    })();
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.connected) {
      fetchCalendars();
      setSelectedCalendar(status.calendarId ?? '');
      setSelectedEventCalendar(status.eventCalendarId ?? '');
    }
  }, [
    status?.connected,
    status?.calendarId,
    status?.eventCalendarId,
    fetchCalendars,
  ]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected === 'true') toast.success('Google 계정이 연결되었습니다!');
    if (error === 'access_denied') toast.error('Google 연동이 취소되었습니다.');
    if (error === 'token_error')
      toast.error('토큰 발급에 실패했습니다. 다시 시도해주세요.');
    if (error === 'callback_error') toast.error('연동 중 오류가 발생했습니다.');
  }, [searchParams]);

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
        toast.success(data.message);
        await fetchStatus();
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

      <main className="flex-1 pt-14 pb-24">
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
                  <Button className="rounded-pill bg-foreground text-background hover:bg-foreground/90 w-full font-bold">
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
                          <CheckCircleIcon className="text-muted-foreground h-4 w-4" />
                          <span className="text-body text-foreground font-bold">
                            정상 동작 중
                          </span>
                        </div>
                        <p className="text-caption text-muted-foreground">
                          마지막 동기화: {formatLastSync(status.lastSync)}
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
                        {isSyncing ? '중' : '지금'}
                      </Button>
                    </div>
                  </Card>
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
