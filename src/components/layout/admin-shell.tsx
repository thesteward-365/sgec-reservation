'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AdminBottomNav } from './admin-bottom-nav';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  children: React.ReactNode;
  className?: string;
  hideNav?: boolean;
}

function AdminShell({
  children,
  className,
  hideNav: hideNavProp,
}: AdminShellProps) {
  const pathname = usePathname();

  // 하단 탭을 숨길 경로들 (AdminBottomNav와 동일한 로직)
  const hideNavPaths = [
    '/admin/places',
    '/admin/calendar',
    '/admin/calendar/events',
    '/admin/activities',
    '/admin/changelog',
  ];
  const isReservationDetail = /^\/admin\/reservations\/\d+$/.test(
    pathname || ''
  );

  const shouldHideNav =
    hideNavProp ?? (hideNavPaths.includes(pathname || '') || isReservationDetail);

  return (
    <div className="flex min-h-dvh justify-center bg-(--color-neutral-150)">
      <div
        className={cn(
          'relative flex min-h-dvh w-full max-w-107.5 flex-col bg-(--color-neutral-150)',
          !shouldHideNav && 'pb-20',
          className
        )}
      >
        {children}
        {!shouldHideNav && <AdminBottomNav />}
      </div>
    </div>
  );
}

export { AdminShell };
