'use client';

import { useEffect, useState } from 'react';
import { BrandHeader } from '@/components/layout/brand-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { CheckIcon } from '@heroicons/react/24/solid';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';

interface User {
  id: number;
  name: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string | null;
}

type TabType = '승인 대기' | '전체 사용자';

const CHIP_BASE =
  'inline-flex items-center font-medium leading-none rounded-pill px-3 py-[6px] text-caption transition-colors duration-120 cursor-pointer select-none whitespace-nowrap';
const CHIP_ACTIVE = 'bg-(--color-fg-strong) text-white';
const CHIP_INACTIVE = 'bg-neutral-300 text-foreground';

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

function formatJoinDate(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `가입 ${y}.${m}.${day}`;
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('승인 대기');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuUser, setMenuUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data: User[]) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pendingUsers = users.filter((u) => u.status === 'pending');

  async function callPatch(userId: number, body: object) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as {
      id: number;
      role: User['role'];
      status: User['status'];
    };
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
    );
    setMenuUser((prev) =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev
    );
  }

  // ── 승인 대기 렌더 ─────────────────────────────────
  const renderPending = () => {
    if (loading) {
      return <ListSkeleton count={4} />;
    }

    if (pendingUsers.length === 0) {
      return (
        <div className="bg-card rounded-xl p-10 text-center shadow-(--shadow-1)">
          <p className="text-body text-muted-foreground font-medium">
            승인 대기 중인 사용자가 없습니다
          </p>
        </div>
      );
    }

    return (
      <List>
        {pendingUsers.map((user) => (
          <ListItem key={user.id} className="bg-card shadow-(--shadow-1)">
            <div className="space-y-1">
              <p className="text-body text-foreground font-bold">{user.name}</p>
              <p className="text-body-sm text-foreground font-medium">
                {user.phoneNumber}
              </p>
              <p className="text-caption text-muted-foreground mt-1">
                {formatTimeAgo(user.createdAt)}
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                className="text-body-sm rounded-pill border-border text-foreground flex flex-1 items-center justify-center border py-3 font-semibold transition-colors hover:bg-neutral-50"
                onClick={() => callPatch(user.id, { action: 'reject' })}
              >
                거절
              </button>
              <button
                className="text-body-sm rounded-pill bg-primary hover:bg-accent-hover flex flex-1 items-center justify-center gap-1.5 py-3 font-semibold text-white transition-colors"
                onClick={() => callPatch(user.id, { action: 'approve' })}
              >
                <CheckIcon className="h-4 w-4" />
                승인
              </button>
            </div>
          </ListItem>
        ))}
      </List>
    );
  };

  // ── 전체 사용자 렌더 ───────────────────────────────
  const renderAll = () => {
    if (loading) {
      return (
        <Card className="overflow-hidden p-0">
          <div className="divide-border/50 divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex animate-pulse flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="bg-muted h-5 w-20 rounded" />
                  <div className="bg-muted h-8 w-8 rounded-full" />
                </div>
                <div className="bg-muted h-4 w-48 rounded" />
              </div>
            ))}
          </div>
        </Card>
      );
    }

    if (users.length === 0) {
      return (
        <div className="bg-card rounded-xl p-10 text-center shadow-(--shadow-1)">
          <p className="text-body text-muted-foreground font-medium">
            가입된 사용자가 없습니다
          </p>
        </div>
      );
    }

    return (
      <List>
        {users.map((user) => {
          const isDisabled = user.status === 'rejected';

          return (
            <ListItem
              key={user.id}
              className={`flex items-center justify-between transition-colors ${isDisabled ? 'opacity-50 hover:bg-transparent' : 'hover:bg-neutral-50'}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body text-foreground font-bold">
                    {user.name}
                  </span>
                  {user.role === 'admin' && (
                    <Badge
                      variant="subtle"
                      color="blue"
                      className="text-[11px] font-bold"
                    >
                      관리자
                    </Badge>
                  )}
                  {isDisabled && (
                    <Badge
                      variant="subtle"
                      color="neutral"
                      className="text-[11px] font-bold"
                    >
                      비활성화
                    </Badge>
                  )}
                </div>
                <span className="text-caption text-muted-foreground mt-1.5 block font-medium">
                  {user.phoneNumber}
                </span>
              </div>
              <button
                className="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 active:bg-neutral-200"
                onClick={() => setMenuUser(user)}
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </button>
            </ListItem>
          );
        })}
      </List>
    );
  };

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-10">
        {/* 탭 */}
        <div className="flex gap-1.5 px-5 py-4">
          {(['승인 대기', '전체 사용자'] as TabType[]).map((tab) => (
            <Chip
              key={tab}
              variant={activeTab === tab ? 'active' : 'inactive'}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === '승인 대기' && pendingUsers.length > 0 && (
                <span className="ml-1 opacity-80">· {pendingUsers.length}</span>
              )}
            </Chip>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="space-y-2 px-5 pb-5">
          {activeTab === '승인 대기' ? renderPending() : renderAll()}
        </div>
      </main>

      {/* 사용자 액션 드로어 */}
      <Drawer
        open={!!menuUser}
        onOpenChange={(open) => !open && setMenuUser(null)}
      >
        <DrawerContent>
          {menuUser && (
            <>
              {/* sr-only 접근성 타이틀 */}
              <DrawerTitle className="sr-only">
                {menuUser.name} 설정
              </DrawerTitle>

              {/* 프로필 정보 — 배경으로 섹션 구분 */}
              <div className="bg-muted/50 mx-4 mt-2 mb-4 rounded-xl px-4 py-4">
                <div className="space-y-2.5">
                  {(
                    [
                      { label: '이름', value: menuUser.name },
                      { label: '전화번호', value: menuUser.phoneNumber },
                      {
                        label: '가입일',
                        value:
                          formatJoinDate(menuUser.createdAt)?.replace(
                            '가입 ',
                            ''
                          ) ?? '-',
                      },
                    ] as { label: string; value: string }[]
                  ).map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-4">
                      <span className="text-caption text-muted-foreground w-14 shrink-0">
                        {label}
                      </span>
                      <span className="text-body-sm text-foreground font-medium">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 토글 액션 */}
              <div className="space-y-1 px-4">
                {/* 관리자 권한 */}
                <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3.5">
                  <div>
                    <span className="text-body-sm text-foreground block font-semibold">
                      관리자 권한
                    </span>
                    <span className="text-caption text-muted-foreground mt-0.5 block">
                      관리자 페이지에 접근할 수 있습니다
                    </span>
                  </div>
                  <Switch
                    checked={menuUser.role === 'admin'}
                    onCheckedChange={(checked) =>
                      callPatch(menuUser.id, {
                        action: 'set-role',
                        role: checked ? 'admin' : 'user',
                      })
                    }
                  />
                </div>

                {/* 계정 활성화 */}
                <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3.5">
                  <div>
                    <span className="text-body-sm text-foreground block font-semibold">
                      계정 활성화
                    </span>
                    <span className="text-caption text-muted-foreground mt-0.5 block">
                      비활성화 시 로그인이 차단됩니다
                    </span>
                  </div>
                  <Switch
                    checked={menuUser.status === 'approved'}
                    onCheckedChange={(checked) =>
                      callPatch(menuUser.id, {
                        action: 'set-status',
                        status: checked ? 'approved' : 'rejected',
                      })
                    }
                  />
                </div>
              </div>

              {/* 닫기 */}
              <DrawerClose asChild>
                <button className="rounded-pill border-border text-body-sm text-muted-foreground hover:text-foreground mx-4 mt-4 mb-6 w-[calc(100%-2rem)] border py-3 font-semibold transition-colors">
                  닫기
                </button>
              </DrawerClose>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
