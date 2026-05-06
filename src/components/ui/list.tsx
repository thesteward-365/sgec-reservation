'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const List = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<
    React.HTMLAttributes<HTMLDivElement> & {
      emptyMessage?: string;
    }
  >
>(
  (
    { children, emptyMessage = '데이터가 없습니다', className, ...props },
    ref
  ) => {
    const hasChildren = React.Children.count(children) > 0;

    if (!hasChildren) {
      return (
        <Card
          className={cn('overflow-hidden p-0', className)}
          ref={ref}
          {...props}
        >
          <div className="p-10">
            <p className="text-body text-muted-foreground text-center">
              {emptyMessage}
            </p>
          </div>
        </Card>
      );
    }

    return (
      <Card
        className={cn('overflow-hidden p-0', className)}
        ref={ref}
        {...props}
      >
        <div className="divide-border/50 divide-y">{children}</div>
      </Card>
    );
  }
);
List.displayName = 'List';

const ListItem = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('px-5 py-4', className)} {...props}>
    {children}
  </div>
));
ListItem.displayName = 'ListItem';

export { List, ListItem };
