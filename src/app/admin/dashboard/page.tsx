'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandHeader } from '@/components/layout/brand-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UsersIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronRightIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  pendingUsersCount: number;
  totalUsersCount: number;
  totalReservationsCount: number;
  recentActivities: Array<{
    id: number;
    type: string;
    message: string;
    timestamp: Date;
  }>;
}

const QUICK_ACTIONS = [
  {
    href: '/admin/users',
    icon: UsersIcon,
    title: '사용자 관리',
    description: '회원 승인 및 관리',
    badge: 'pendingUsersCount',
  },
  {
    href: '/admin/reservations',
    icon: CalendarDaysIcon,
    title: '예약 관리',
    description: '예약 현황 및 관리',
  },
  {
    href: '/admin/places',
    icon: MapPinIcon,
    title: '장소 관리',
    description: '장소 및 시설 관리',
  },
  {
    href: '/admin/calendar',
    icon: CalendarIcon,
    title: 'Calendar 연동',
    description: 'Google Calendar 설정',
  },
];

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}시간 전`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'user_approved':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'reservation_cancelled':
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    case 'place_updated':
      return <CogIcon className="h-5 w-5 text-blue-500" />;
    default:
      return <UserIcon className="h-5 w-5 text-gray-500" />;
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <>
      <BrandHeader
        action={
          <div className="flex items-center gap-2">
            <span className="text-body-small text-muted-foreground">
              관리자
            </span>
            <UserIcon className="text-muted-foreground h-5 w-5" />
          </div>
        }
      />

      <main className="flex-1 pb-24">
        {/* 상단 요약 */}
        <section className="px-5 py-6">
          <div className="mb-6">
            <h1 className="text-headline1 mb-1">정연희님</h1>
            <p className="text-body-medium text-muted-foreground">
              관리자로 로그인하셨습니다
            </p>
            <p className="text-body-small text-muted-foreground mt-2">
              오늘 처리할 일: 승인 대기 사용자 확인, 예약 현황 점검
            </p>
          </div>

          {/* 승인 대기 카드 */}
          <Card className="mb-6 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-headline2 font-bold text-orange-600">
                    {loading ? '...' : stats?.pendingUsersCount || 0}
                  </span>
                  <span className="text-body-medium">명의 승인 대기</span>
                </div>
                <p className="text-body-small text-muted-foreground">
                  확인 필요
                </p>
              </div>
              <Link href="/admin/users">
                <Button variant="secondary" size="sm">
                  확인하기
                  <ChevronRightIcon className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* 빠른 진입 메뉴 */}
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              const badgeValue =
                action.badge && stats
                  ? (stats[action.badge as keyof DashboardStats] as number)
                  : null;

              return (
                <Link key={action.href} href={action.href}>
                  <Card className="p-4 transition-shadow hover:shadow-md">
                    <div className="mb-2 flex items-start justify-between">
                      <Icon className="text-muted-foreground h-6 w-6" />
                      {badgeValue && badgeValue > 0 && (
                        <Badge variant="solid" color="orange" className="text-xs">
                          {badgeValue}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-body-medium mb-1 font-semibold">
                      {action.title}
                    </h3>
                    <p className="text-body-small text-muted-foreground">
                      {action.description}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 최근 활동 */}
        <section className="px-5 pb-6">
          <h2 className="text-headline2 mb-4">최근 활동</h2>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="animate-pulse">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="bg-muted h-5 w-5 rounded" />
                      <div className="bg-muted h-4 flex-1 rounded" />
                    </div>
                    <div className="bg-muted h-3 w-16 rounded" />
                  </div>
                </Card>
              ))
            ) : stats?.recentActivities?.length ? (
              stats.recentActivities.map((activity) => (
                <Card key={activity.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-body-medium">{activity.message}</p>
                      <p className="text-body-small text-muted-foreground mt-1">
                        {formatTimeAgo(new Date(activity.timestamp))}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-4">
                <p className="text-body-medium text-muted-foreground text-center">
                  최근 활동이 없습니다
                </p>
              </Card>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
