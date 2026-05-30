'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/layout/brand-header';
import { Badge } from '@/components/ui/badge';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { toast } from 'sonner';
import {
  UserIcon,
  CalendarDaysIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import pkg from '../../../../package.json';
import { AppVersion } from '@/components/layout/app-version';

interface Me {
  id: number;
  name: string;
  username: string;
  phoneNumber: string;
  role: 'user' | 'admin';
}

export default function AdminMePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/account')
      .then((r) => r.json())
      .then((data: { user: Me }) => {
        setMe(data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-10">
        <div className="space-y-4 px-5 pt-4 pb-5">
          {/* 프로필 섹션 */}
          {loading ? (
            <ListSkeleton
              count={1}
              className="rounded-lg shadow-(--shadow-1)"
            />
          ) : me ? (
            <List className="rounded-lg shadow-(--shadow-1)">
              <ListItem className="p-0">
                <button
                  onClick={() => router.push('/settings/profile')}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200">
                      <UserCircleIcon className="h-7 w-7 text-neutral-500" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-body text-foreground font-bold">
                          {me.username}
                        </span>
                        {me.role === 'admin' && (
                          <Badge
                            variant="subtle"
                            color="blue"
                            className="text-[11px] font-bold"
                          >
                            관리자
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground block text-[13px] font-medium">
                        {me.name}님
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
                </button>
              </ListItem>
            </List>
          ) : null}

          {/* 메뉴 섹션 */}
          <List className="rounded-lg shadow-(--shadow-1)">
            <ListItem className="border-border-subtle/50 border-b p-0">
              <Link
                href="/reserve"
                className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50"
              >
                <UserIcon className="text-foreground size-5" />
                <span className="text-foreground flex-1 text-[15px] font-semibold">
                  사용자 페이지로 이동
                </span>
                <ChevronRightIcon className="text-muted-foreground size-4" />
              </Link>
            </ListItem>
            <ListItem className="p-0">
              <Link
                href="/admin/calendar"
                className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50"
              >
                <CalendarDaysIcon className="text-foreground size-5" />
                <span className="text-foreground flex-1 text-[15px] font-semibold">
                  Google Calendar 연동
                </span>
                <ChevronRightIcon className="text-muted-foreground size-4" />
              </Link>
            </ListItem>
          </List>

          {/* 로그아웃 */}
          <List className="rounded-lg shadow-(--shadow-1)">
            <ListItem className="p-0">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-5 py-4 transition-colors hover:bg-neutral-50"
              >
                <ArrowRightStartOnRectangleIcon className="text-destructive size-5" />
                <span className="text-destructive flex-1 text-left text-[15px] font-semibold">
                  로그아웃
                </span>
              </button>
            </ListItem>
          </List>

          {/* 버전 */}
          <AppVersion />
        </div>
      </main>
    </>
  );
}
