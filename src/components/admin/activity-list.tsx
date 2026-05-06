'use client';

import * as React from 'react';
import { List, ListItem } from '@/components/ui/list';
import { formatTimeAgo } from '@/lib/utils';

export interface Activity {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

interface ActivityListProps extends React.HTMLAttributes<HTMLDivElement> {
  activities: Activity[];
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

const ActivityList = React.forwardRef<HTMLDivElement, ActivityListProps>(
  ({ activities, ...props }, ref) => (
    <List ref={ref} emptyMessage="최근 활동이 없습니다" {...props}>
      {activities.map((activity) => (
        <ListItem key={activity.id}>
          <div className="flex items-start gap-3">
            {getActivityIcon(activity.type)}
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium">{activity.message}</p>
              <p className="text-caption text-muted-foreground mt-1">
                {formatTimeAgo(new Date(activity.timestamp))}
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
