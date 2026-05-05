'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon as HomeOutline,
  UsersIcon as UsersOutline,
  CalendarDaysIcon as CalendarDaysOutline,
  UserIcon as UserOutline,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid,
  UsersIcon as UsersSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  UserIcon as UserSolid,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/admin/dashboard',
    OutlineIcon: HomeOutline,
    SolidIcon: HomeSolid,
    label: '홈',
  },
  {
    href: '/admin/users',
    OutlineIcon: UsersOutline,
    SolidIcon: UsersSolid,
    label: '사용자',
  },
  {
    href: '/admin/reservations',
    OutlineIcon: CalendarDaysOutline,
    SolidIcon: CalendarDaysSolid,
    label: '예약',
  },
  {
    href: '/admin/me',
    OutlineIcon: UserOutline,
    SolidIcon: UserSolid,
    label: '내 정보',
  },
] as const;

function AdminBottomNav() {
  const pathname = usePathname();

  // 장소 관리 페이지에서는 내비게이션을 숨김
  if (pathname === '/admin/places') return null;

  return (
    <nav
      className="bg-background fixed inset-x-0 bottom-0 z-40"
      style={{ boxShadow: '0 -1px 0 var(--color-border-subtle)' }}
    >
      <div
        className="mx-auto grid max-w-107.5 grid-cols-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(({ href, OutlineIcon, SolidIcon, label }) => {
          const isActive = pathname?.startsWith(href) ?? false;
          const Icon = isActive ? SolidIcon : OutlineIcon;

          return (
            <Link key={href} href={href}>
              <div
                className={cn(
                  'flex flex-col items-center gap-1 py-3',
                  'transition-colors duration-120 ease-(--ease-standard)',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon width={22} height={22} />
                <span
                  className={cn(
                    'text-overline',
                    isActive ? 'font-bold' : 'font-semibold'
                  )}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export { AdminBottomNav };
