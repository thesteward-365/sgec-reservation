'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandHeader } from '@/components/layout/brand-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        // 성공 메시지 표시 (실제로는 토스트 등으로)
        alert(data.message);
      } else {
        alert('동기화에 실패했습니다');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('동기화 중 오류가 발생했습니다');
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
        alert(data.message);
      } else {
        alert('연결 해제에 실패했습니다');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('연결 해제 중 오류가 발생했습니다');
    }
  };

  return (
    <>
      <BrandHeader
        action={
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
        }
      />

      <main className="flex-1 pb-24">
        {/* 헤더 */}
        <div className="border-border-subtle border-b px-5 py-4">
          <h1 className="text-headline2">Google Calendar 연동</h1>
        </div>

        <div className="space-y-6 p-5">
          {/* 연결된 계정 */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500">
                  <span className="text-lg font-bold text-white">G</span>
                </div>
                <div>
                  <p className="text-body-medium font-semibold">
                    admin@samgeum.org
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    <span className="text-body-small text-green-600">
                      연결됨
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="border-red-200 text-red-600"
                onClick={handleDisconnect}
              >
                해제
              </Button>
            </div>
          </Card>

          {/* 예약 캘린더 */}
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-body-medium font-semibold">
                    예약 캘린더
                  </h3>
                  <Badge variant="solid" color="blue" className="text-xs">
                    양방향 동기화
                  </Badge>
                </div>
                <p className="text-body-small text-muted-foreground mb-3">
                  장소 예약 정보를 Google Calendar와 실시간으로 동기화합니다.
                </p>
                <div className="text-body-small">
                  <span className="font-medium">연결된 캘린더:</span> 샘깊은교회
                  장소 예약
                </div>
              </div>
            </div>
          </Card>

          {/* 행사 일정 캘린더 */}
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <MusicalNoteIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-body-medium font-semibold">
                    행사 일정 캘린더
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    읽기 전용
                  </Badge>
                </div>
                <p className="text-body-small text-muted-foreground mb-3">
                  교회 행사 일정을 참고하여 예약 가능 시간을 자동으로
                  조정합니다.
                </p>
                <div className="text-body-small">
                  <span className="font-medium">연결된 캘린더:</span> 샘깊은교회
                  행사 일정
                </div>
              </div>
            </div>
          </Card>

          {/* 동기화 섹션 */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-body-medium mb-1 font-semibold">
                  동기화 상태
                </h3>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-body-small text-green-600">정상</span>
                  <span className="text-body-small text-muted-foreground">
                    마지막 동기화: {formatLastSync(lastSync)}
                  </span>
                </div>
              </div>
              <Button onClick={handleSync} disabled={isSyncing} size="sm">
                <ArrowPathIcon
                  className={`mr-1 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
                />
                {isSyncing ? '동기화 중...' : '지금 동기화'}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
