'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';

const ListSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    count?: number;
  }
>(({ count = 3, ...props }, ref) => (
  <Card className="overflow-hidden p-0" ref={ref} {...props}>
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3 px-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-muted h-4 w-3/4 rounded" />
          </div>
          <div className="bg-muted h-3 w-16 rounded" />
        </div>
      ))}
    </div>
  </Card>
));
ListSkeleton.displayName = 'ListSkeleton';

export { ListSkeleton };
