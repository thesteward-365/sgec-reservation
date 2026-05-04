import * as React from 'react';
import { AdminBottomNav } from './admin-bottom-nav';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  children: React.ReactNode;
  className?: string;
  hideNav?: boolean;
}

function AdminShell({ children, className, hideNav = false }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh justify-center bg-(--color-neutral-150)">
      <div
        className={cn(
          'relative flex min-h-dvh w-full max-w-107.5 flex-col bg-(--color-neutral-150)',
          className
        )}
      >
        {children}
        {!hideNav && <AdminBottomNav />}
      </div>
    </div>
  );
}

export { AdminShell };
