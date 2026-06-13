'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AdminBottomNav } from './admin-bottom-nav';
import { cn } from '@/lib/utils';
import { shouldHideBottomNav } from '@/lib/nav-utils';
import { AdminChangelogModal } from '@/components/admin/admin-changelog-modal';

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

  const shouldHideNav = hideNavProp ?? shouldHideBottomNav(pathname);

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
        <AdminChangelogModal />
      </div>
    </div>
  );
}

export { AdminShell };
