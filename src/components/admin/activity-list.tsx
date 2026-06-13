'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { HistoryListItem } from '@/components/reservations/history-list-item';

export interface Activity {
  id: number;
  reservationId: number;
  type: 'created' | 'updated' | 'cancelled';
  message: string;
  actor: string;
  place?: string | null;
  timestamp: string;
  changes?: any;
  reservationPurpose?: string | null;
}

interface ActivityListProps extends React.HTMLAttributes<HTMLDivElement> {
  activities: Activity[];
}

const ActivityList = React.forwardRef<HTMLDivElement, ActivityListProps>(
  ({ activities, ...props }, ref) => {
    const router = useRouter();

    return (
      <div ref={ref} className="flex flex-col gap-3" {...props}>
        {activities.length > 0 ? (
          activities.map((activity) => (
            <HistoryListItem
              key={activity.id}
              item={{
                id: activity.id,
                reservationId: activity.reservationId,
                actionType: activity.type,
                actorUserName: activity.actor,
                changes: activity.changes || {},
                createdAt: new Date(activity.timestamp),
                placeName: activity.place,
                reservationPurpose: activity.reservationPurpose,
              }}
              showPlaceName
              onClick={() => router.push(`/admin/reservations/${activity.reservationId}`)}
            />
          ))
        ) : (
          <div className="bg-card rounded-xl px-4 py-10 text-center shadow-(--shadow-1)">
            <p className="text-foreground text-[15px] font-semibold">
              최근 활동이 없습니다
            </p>
          </div>
        )}
      </div>
    );
  }
);
ActivityList.displayName = 'ActivityList';

export { ActivityList };
