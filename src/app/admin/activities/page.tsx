'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { List, ListItem } from '@/components/ui/list';
import { formatTimeAgo } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface Activity {
  id: number;
  actionType: 'created' | 'updated' | 'cancelled';
  actorUserId: number;
  actorUserName: string;
  changes: string;
  createdAt: number;
  reservationId: number;
  placeName: string | null;
}

function buildActivityMessage(activity: Activity) {
  const place = activity.placeName ? `${activity.placeName} ` : '';
  switch (activity.actionType) {
    case 'created':
      return `${activity.actorUserName}님이 ${place}예약을 생성했습니다`;
    case 'updated':
      return `${activity.actorUserName}님이 ${place}예약을 수정했습니다`;
    case 'cancelled':
      return `${activity.actorUserName}님이 ${place}예약을 취소했습니다`;
    default:
      return `${activity.actorUserName}님이 작업을 수행하였습니다`;
  }
}

const getActivityIcon = (type: string) => {
  const baseClasses = 'mt-1.5 h-2.5 w-2.5 rounded-full';
  switch (type) {
    case 'created':
      return <div className={`${baseClasses} bg-green-500`} />;
    case 'cancelled':
      return <div className={`${baseClasses} bg-red-500`} />;
    case 'updated':
      return <div className={`${baseClasses} bg-blue-500`} />;
    default:
      return <div className={`${baseClasses} bg-gray-500`} />;
  }
};

export default function ActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch('/api/admin/activities');
        if (response.ok) {
          const data = await response.json();
          setActivities(data);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, []);

  const formatChangeValue = (key: string, value: any) => {
    if (key === 'startTime' || key === 'endTime') {
      return new Date(value).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return value;
  };

  const renderChanges = (changesJson: string) => {
    try {
      const changes = JSON.parse(changesJson);
      return (
        <div className="space-y-3">
          {Object.entries(changes).map(([key, value]: [string, any]) => {
            if (key === 'cancelled') return null;
            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-caption text-muted-foreground font-medium uppercase">
                  {key === 'startTime' ? '시작 시간' : key === 'endTime' ? '종료 시간' : key === 'purpose' ? '사용 목적' : key}
                </span>
                <div className="text-body flex items-center gap-2">
                  <span className="line-through opacity-50">{formatChangeValue(key, value.from)}</span>
                  <span>→</span>
                  <span className="font-semibold text-blue-600">{formatChangeValue(key, value.to)}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch {
      return <p className="text-body">상세 내역을 불러올 수 없습니다.</p>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-neutral-150 px-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">활동 내역</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-white shadow-1" />
            ))}
          </div>
        ) : (
          <List emptyMessage="활동 내역이 없습니다.">
            {activities.map((activity) => (
              <ListItem
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className="cursor-pointer active:bg-neutral-50"
              >
                <div className="flex items-start gap-3">
                  {getActivityIcon(activity.actionType)}
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium">{buildActivityMessage(activity)}</p>
                    <p className="text-caption text-muted-foreground mt-1">
                      {formatTimeAgo(new Date(activity.createdAt))}
                    </p>
                  </div>
                </div>
              </ListItem>
            ))}
          </List>
        )}
      </main>

      <Drawer open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>활동 상세</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-10">
            {selectedActivity && (
              <div className="space-y-6">
                <div>
                  <p className="text-caption text-muted-foreground">일시</p>
                  <p className="text-body font-medium">
                    {new Date(selectedActivity.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">작업자</p>
                  <p className="text-body font-medium">{selectedActivity.actorUserName}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground mb-2">변경 내용</p>
                  <div className="rounded-xl bg-neutral-100 p-4">
                    {selectedActivity.actionType === 'created' ? (
                      <p className="text-body text-green-600 font-semibold">새로운 예약을 생성했습니다.</p>
                    ) : selectedActivity.actionType === 'cancelled' ? (
                      <p className="text-body text-red-600 font-semibold">예약을 취소했습니다.</p>
                    ) : (
                      renderChanges(selectedActivity.changes)
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
