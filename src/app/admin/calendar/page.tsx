'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';

export default function CalendarPage() {
  const [isConnected, setIsConnected] = useState(true); // 실제로는 API에서 가져와야 함
  const [lastSync, setLastSync] = useState(
    new Date(Date.now() - 1000 * 60 * 30)
  ); // 30분 전
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastSync(new Date(data.lastSync));
        toast.success(data.message);
      } else {
        toast.error('동기화에 실패했습니다');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('동기화 중 오류가 발생했습니다');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else {
      return `${Math.floor(diffInMinutes / 60)}시간 전`;
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Google Calendar 연결을 해제하시겠습니까?')) return;

    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(false);
        toast.success(data.message);
      } else {
        toast.error('연결 해제에 실패했습니다');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('연결 해제 중 오류가 발생했습니다');
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          <Link
            href="/admin/dashboard"
            className="text-foreground flex size-10 items-center justify-center rounded-xl transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
          >
            <ChevronLeftIcon className="text-black size-5" />
          </Link>
          <p className="text-body text-foreground flex-1 text-center font-bold!">
            Google Calendar 연동
          </p>
          <div className="size-10" />
        </div>
      </div>

      <main className="flex-1 pt-14 pb-24">
        <div className="space-y-4 px-5 py-6">
          {/* 섹션 1. 연결된 계정 */}
          <section className="space-y-2">
            <p className="text-caption text-muted-foreground font-bold px-1">Google 계정</p>
            <Card className="p-4 shadow-(--shadow-1)">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
                    <span className="text-[17px] font-bold text-foreground">G</span>
                  </div>
                  <div>
                    <p className="text-body text-foreground font-bold">
                      admin@samgeum.org
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-caption font-semibold text-muted-foreground">
                        연결됨
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-3 text-[13px] font-bold text-foreground bg-neutral-200 border-none hover:bg-neutral-300"
                  onClick={handleDisconnect}
                >
                  해제
                </Button>
              </div>
            </Card>
          </section>

          {/* 섹션 2. 캘린더 설정 */}
          <section className="space-y-2">
            <p className="text-caption text-muted-foreground font-bold px-1">캘린더 관리</p>
            <Card className="p-0 overflow-hidden shadow-(--shadow-1)">
              <div className="divide-y divide-border/50">
                {/* 예약 캘린더 */}
                <div className="p-5 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <CalendarDaysIcon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body text-foreground font-bold mb-1">예약 캘린더</h3>
                    <p className="text-caption text-muted-foreground mb-3 leading-snug">
                      장소 예약 정보를 Google Calendar와 실시간으로 동기화합니다.
                    </p>
                    <div className="text-caption text-foreground font-medium flex items-center gap-2">
                      <span className="text-muted-foreground">연결됨:</span> 
                      <span className="truncate">샘깊은교회 장소 예약</span>
                    </div>
                  </div>
                </div>

                {/* 행사 일정 캘린더 */}
                <div className="p-5 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <MusicalNoteIcon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body text-foreground font-bold mb-1">행사 일정 캘린더</h3>
                    <p className="text-caption text-muted-foreground mb-3 leading-snug">
                      교회 행사 일정을 참고하여 예약 가능 시간을 자동으로 조정합니다.
                    </p>
                    <div className="text-caption text-foreground font-medium flex items-center gap-2">
                      <span className="text-muted-foreground">연결됨:</span> 
                      <span className="truncate">샘깊은교회 행사 일정</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* 섹션 3. 동기화 섹션 */}
          <section className="space-y-2">
            <p className="text-caption text-muted-foreground font-bold px-1">동기화 상태</p>
            <Card className="p-5 shadow-(--shadow-1)">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-body font-bold text-foreground">정상 동작 중</span>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    마지막 동기화: {formatLastSync(lastSync)}
                  </p>
                </div>
                <Button 
                  onClick={handleSync} 
                  disabled={isSyncing} 
                  size="sm"
                  className="rounded-pill font-bold bg-foreground text-background hover:bg-foreground/90"
                >
                  <ArrowPathIcon
                    className={`mr-1 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  {isSyncing ? '중' : '지금'}
                </Button>
              </div>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}
