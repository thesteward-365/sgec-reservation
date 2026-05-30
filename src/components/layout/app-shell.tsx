'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { ConditionalNav } from './conditional-nav';
import { cn } from '@/lib/utils';
import { shouldHideBottomNav } from '@/lib/nav-utils';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  hideNav?: boolean;
}

function AppShell({
  children,
  className,
  hideNav: hideNavProp = false,
}: AppShellProps) {
  const pathname = usePathname();

  // hideNavProp이 true이거나, 현재 경로가 내비게이션을 숨겨야 하는 경로인 경우
  const isNavHidden = hideNavProp || shouldHideBottomNav(pathname);

  return (
    <div className="flex min-h-dvh justify-center bg-(--color-neutral-150)">
      <div
        className={cn(
          'relative flex min-h-dvh w-full max-w-107.5 flex-col bg-(--color-neutral-150)',
          !isNavHidden && 'pb-20',
          className
        )}
      >
        {children}
        {!isNavHidden && <ConditionalNav />}
      </div>
    </div>
  );
}

export { AppShell };
