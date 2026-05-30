'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeftIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { ActivityListSkeleton } from '@/components/admin/activity-list-skeleton';
import {
  HistoryListItem,
  type HistoryItem,
} from '@/components/reservations/history-list-item';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { fromDbDate } from '@/lib/db/db-utils';

export default function ActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const response = await fetch(`/api/admin/activities?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Standardize data format for HistoryListItem
        const mapped = (data as any[]).map((item) => ({
          ...item,
          createdAt: fromDbDate(item.createdAt),
          changes:
            typeof item.changes === 'string'
              ? JSON.parse(item.changes)
              : item.changes,
        }));
        setActivities(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleApplyFilter = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setShowFilter(false);
  };

  return (
    <div className="bg-neutral-150 flex min-h-screen flex-col">
      <header className="bg-neutral-150 sticky top-0 z-10 flex h-14 items-center justify-between px-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">활동 내역</h1>
        <button
          onClick={() => {
            setTempStartDate(startDate);
            setTempEndDate(endDate);
            setShowFilter(true);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
        >
          <AdjustmentsHorizontalIcon className="h-6 w-6" />
        </button>
      </header>

      <main className="flex-1 p-5 pb-20">
        <button
          onClick={() => {
            setTempStartDate(startDate);
            setTempEndDate(endDate);
            setShowFilter(true);
          }}
          className="mb-4 flex w-full items-center justify-between px-1 text-left active:opacity-70"
        >
          <p className="text-caption text-muted-foreground font-medium">
            {new Date(startDate).toLocaleDateString('ko-KR')} ~{' '}
            {new Date(endDate).toLocaleDateString('ko-KR')}
          </p>
          <p className="text-caption text-muted-foreground">
            {activities.length}건
          </p>
        </button>

        {loading ? (
          <ActivityListSkeleton count={5} />
        ) : activities.length === 0 ? (
          <div className="text-muted-foreground py-20 text-center">
            활동 내역이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((activity) => (
              <HistoryListItem
                key={activity.id}
                item={activity}
                showPlaceName
                onClick={() =>
                  router.push(`/admin/reservations/${activity.reservationId}`)
                }
              />
            ))}
          </div>
        )}
      </main>

      <Drawer open={showFilter} onOpenChange={setShowFilter}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>기간 설정</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-6 px-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-caption text-muted-foreground font-medium uppercase">
                  시작일
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="h-12 rounded-xl border-none bg-neutral-100 px-4"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-caption text-muted-foreground font-medium uppercase">
                  종료일
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="h-12 rounded-xl border-none bg-neutral-100 px-4"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outlined"
                color="secondary"
                size="large"
                onClick={() => {
                  const d = new Date();
                  const end = d.toISOString().split('T')[0];
                  d.setDate(d.getDate() - 7);
                  const start = d.toISOString().split('T')[0];
                  setTempStartDate(start);
                  setTempEndDate(end);
                }}
              >
                최근 1주일
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                size="large"
                onClick={() => {
                  const d = new Date();
                  const end = d.toISOString().split('T')[0];
                  d.setMonth(d.getMonth() - 1);
                  const start = d.toISOString().split('T')[0];
                  setTempStartDate(start);
                  setTempEndDate(end);
                }}
              >
                최근 1개월
              </Button>
            </div>
          </div>
          <DrawerFooter className="px-6 pt-2 pb-10">
            <Button
              variant="contained"
              color="primary"
              size="large"
              className="w-full"
              onClick={handleApplyFilter}
            >
              적용하기
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
