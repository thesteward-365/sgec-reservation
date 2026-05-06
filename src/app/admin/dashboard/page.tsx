'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandHeader } from '@/components/layout/brand-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityList } from '@/components/admin/activity-list';
import { ActivityListSkeleton } from '@/components/admin/activity-list-skeleton';
import {
  UsersIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  pendingUsersCount: number;
  totalUsersCount: number;
  totalReservationsCount: number;
  totalPlacesCount: number;
  recentActivities: Array<{
    id: number;
    type: string;
    message: string;
    timestamp: string;
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

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-24">
        <section className="space-y-3 px-5 pb-6">
          {!loading && stats && stats.pendingUsersCount > 0 && (
            <Link href="/admin/users">
              <div
                className="group flex items-center justify-between gap-3 rounded-xl p-4 transition"
                style={{ backgroundColor: 'var(--color-warning-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400" />
                  <div>
                    <p className="text-body-sm text-foreground font-semibold">
                      {stats.pendingUsersCount}명이 가입 승인을 기다리고 있어요
                    </p>
                    <p
                      className="text-caption"
                      style={{ color: 'var(--color-warning)' }}
                    >
                      탭하여 승인 처리
                    </p>
                  </div>
                </div>
                <ChevronRightIcon
                  className="h-4 w-4 shrink-0 transition"
                  style={{ color: 'var(--color-warning)' }}
                />
              </div>
            </Link>
          )}
        </section>

        <section className="px-5 pb-10">
          <div className="mb-4">
            <p className="text-h5 font-bold!">관리</p>
          </div>

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
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="text-foreground size-5" />
                        <span className="text-foreground flex-1 text-[15px] font-semibold">
                          {action.title}
                        </span>
                      </div>
                      {badgeValue && badgeValue > 0 ? (
                        <Badge
                          variant="solid"
                          color="orange"
                          className="h-5 min-w-5 px-1.5 text-xs"
                        >
                          {badgeValue}
                        </Badge>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="px-5 pb-10">
          <div className="mb-4">
            <p className="text-h5 font-bold!">최근 활동</p>
          </div>

          {loading ? (
            <ActivityListSkeleton />
          ) : stats?.recentActivities ? (
            <ActivityList activities={stats.recentActivities} />
          ) : null}
        </section>
      </main>
    </>
  );
}
