'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandHeader } from '@/components/layout/brand-header';
import { Card } from '@/components/ui/card';
import { ActivityList } from '@/components/admin/activity-list';
import { ActivityListSkeleton } from '@/components/admin/activity-list-skeleton';
import {
  UsersIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface DashboardStats {
  pendingUsersCount: number;
  totalUsersCount: number;
  totalReservationsCount: number;
  totalPlacesCount: number;
  calendarNeedsReauth: boolean;
  recentActivities: Array<{
    id: number;
    reservationId: number;
    type: 'created' | 'updated' | 'cancelled';
    message: string;
    actor: string;
    place?: string | null;
    timestamp: string;
  }>;
}

const QUICK_ACTIONS = [
  {
    href: '/admin/users',
    icon: UsersIcon,
    title: '사용자 관리',
    description: '회원 승인 및 관리',
    badgeKey: 'pendingUsersCount',
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
    badgeKey: 'calendarNeedsReauth',
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

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-10">
        <section className="space-y-4 px-5 pb-6">
          {!loading && stats?.calendarNeedsReauth && (
            <Link href="/admin/calendar">
              <div className="group mb-3 overflow-hidden rounded-xl bg-white">
                <div
                  className="flex items-center justify-between gap-3 p-4 transition-colors active:opacity-80"
                  style={{ backgroundColor: 'var(--color-danger-subtle)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                    <div>
                      <p className="text-body-sm text-foreground font-semibold">
                        Google 연동이 만료되었어요
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon
                    className="h-4 w-4 shrink-0 transition"
                    style={{ color: 'var(--color-danger)' }}
                  />
                </div>
              </div>
            </Link>
          )}

          {!loading && stats && stats.pendingUsersCount > 0 && (
            <Link href="/admin/users">
              <div className="group mb-3 overflow-hidden rounded-xl bg-white">
                <div
                  className="group flex items-center justify-between gap-3 rounded-xl p-4 transition-colors active:opacity-80"
                  style={{ backgroundColor: 'var(--color-warning-subtle)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400" />
                    <div>
                      <p className="text-body-sm text-foreground font-semibold">
                        {stats.pendingUsersCount}명이 가입 승인을 기다리고
                        있어요
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon
                    className="h-4 w-4 shrink-0 transition"
                    style={{ color: 'var(--color-warning)' }}
                  />
                </div>
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
              const hasBadge =
                action.badgeKey === 'calendarNeedsReauth'
                  ? stats?.calendarNeedsReauth
                  : action.badgeKey &&
                    stats &&
                    (stats[action.badgeKey as keyof DashboardStats] as number) >
                      0;

              const badgeColor =
                action.badgeKey === 'calendarNeedsReauth'
                  ? 'bg-red-500'
                  : 'bg-orange-400';

              return (
                <Link key={action.href} href={action.href}>
                  <Card className="relative p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="text-foreground size-5" />
                        <span className="text-foreground flex-1 text-[15px] font-semibold">
                          {action.title}
                        </span>
                      </div>
                      {hasBadge && (
                        <span
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            badgeColor
                          )}
                        />
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="px-5 pb-10">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-h5 font-bold!">최근 활동</p>
            <Link
              href="/admin/activities"
              className="text-caption text-muted-foreground font-medium"
            >
              전체보기
            </Link>
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
