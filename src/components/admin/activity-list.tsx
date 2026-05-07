'use client';

import * as React from 'react';
import { List, ListItem } from '@/components/ui/list';
import { formatTimeAgo } from '@/lib/utils';

export interface Activity {
  id: number;
  type: string;
  message: string;
  actor?: string;
  place?: string | null;
  timestamp: string;
}

interface ActivityListProps extends React.HTMLAttributes<HTMLDivElement> {
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  const baseClasses = 'mt-1.5 h-2 w-2 rounded-full shrink-0';

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

const ActivityList = React.forwardRef<HTMLDivElement, ActivityListProps>(
  ({ activities, ...props }, ref) => (
    <List ref={ref} emptyMessage="최근 활동이 없습니다" {...props}>
      {activities.map((activity) => (
        <ListItem key={activity.id}>
          <div className="flex items-start gap-3">
            {getActivityIcon(activity.type)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-body font-semibold truncate">{activity.message}</p>
                <p className="text-caption text-muted-foreground shrink-0">
                  {formatTimeAgo(new Date(activity.timestamp))}
                </p>
              </div>
              <p className="text-caption text-muted-foreground mt-0.5 truncate">
                {activity.actor}{activity.place ? ` · ${activity.place}` : ''}
              </p>
            </div>
          </div>
        </ListItem>
      ))}
    </List>
  )
);
ActivityList.displayName = 'ActivityList';

export { ActivityList };
