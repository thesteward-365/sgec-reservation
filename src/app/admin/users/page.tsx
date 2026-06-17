'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/layout/brand-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { CheckIcon, PlusIcon } from '@heroicons/react/24/solid';
import {
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface User {
  id: number;
  name: string;
  username: string | null;
  phoneNumber: string;
  departmentId: number | null;
  department: string | null;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  createdAt: string | null;
}

interface Department {
  id: number;
  name: string;
  order: number;
}

type TabType = '승인 대기' | '전체 사용자';

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('승인 대기');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuUser, setMenuUser] = useState<User | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // 소속 데이터
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data: User[]) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));

    fetchDepartments();
  }, []);

  // 소속 목록 불러오기
  async function fetchDepartments() {
    try {
      const res = await fetch('/api/admin/departments');
      const data: Department[] = await res.json();
      setDepartments(data);
    } catch (e) {
      console.error(e);
    }
  }

  const pendingUsers = users.filter((u) => u.status === 'pending');

  const departmentGroups = useMemo(() => {
    const groupMap = new Map<string, User[]>();
    for (const u of users) {
      const key = u.department?.trim() || '미지정';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(u);
    }
    const sorted = Array.from(groupMap.entries()).sort(([a], [b]) => {
      if (a === '미지정') return 1;
      if (b === '미지정') return -1;
      return a.localeCompare(b, 'ko');
    });
    return sorted;
  }, [users]);

  const departmentList = useMemo(
    () => departmentGroups.map(([key]) => key),
    [departmentGroups]
  );

  const currentUsers = useMemo(() => {
    if (activeTab === '승인 대기') return pendingUsers;

    if (selectedDeptFilter === 'all') {
      return users;
    }
    if (selectedDeptFilter === 'unassigned') {
      return users.filter((u) => !u.department);
    }
    return users.filter((u) => u.department === selectedDeptFilter);
  }, [activeTab, pendingUsers, users, selectedDeptFilter]);

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
      departmentId: number | null;
      department: string | null;
    };
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
    );
    setMenuUser((prev) =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev
    );
  }

  async function callDelete(userId: number, userName: string) {
    const confirmed = window.confirm(
      `'${userName}' 계정을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다. 해당 사용자의 예약 내역은 삭제되지 않고 보존됩니다.`
    );
    if (!confirmed) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || '삭제 중 오류가 발생했습니다.');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setMenuUser(null);
  }

  // ── 승인 대기 렌더 ─────────────────────────────────
  const renderPending = () => {
    if (loading) return <ListSkeleton count={4} />;

    if (pendingUsers.length === 0) {
      return (
        <div className="bg-card rounded-lg p-10 text-center shadow-(--shadow-1)">
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body text-foreground font-bold">
                  {user.name}
                </p>
                {user.department && (
                  <Badge
                    variant="subtle"
                    color="blue"
                    className="text-[11px] font-bold"
                  >
                    {user.department}
                  </Badge>
                )}
              </div>
              <p className="text-body-sm text-foreground font-medium">
                {user.phoneNumber}
              </p>
              <p className="text-caption text-muted-foreground mt-1">
                {formatTimeAgo(user.createdAt)}
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outlined"
                color="secondary"
                size="large"
                className="flex-1"
                onClick={() => callPatch(user.id, { action: 'reject' })}
              >
                거절
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                className="flex-1"
                onClick={() => callPatch(user.id, { action: 'approve' })}
              >
                <CheckIcon className="h-4 w-4" />
                승인
              </Button>
            </div>
          </ListItem>
        ))}
      </List>
    );
  };

  // ── 전체/소속별 사용자 렌더 ────────────────────────
  const renderUserList = (userList: User[]) => {
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

    if (userList.length === 0) {
      return (
        <div className="bg-card rounded-lg p-10 text-center shadow-(--shadow-1)">
          <p className="text-body text-muted-foreground font-medium">
            {activeTab === '전체 사용자'
              ? '가입된 사용자가 없습니다'
              : `'${activeTab}' 소속 사용자가 없습니다`}
          </p>
        </div>
      );
    }

    return (
      <List>
        {userList.map((user) => {
          const isDisabled =
            user.status === 'rejected' || user.status === 'withdrawn';
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
                  {user.status === 'rejected' && (
                    <Badge
                      variant="subtle"
                      color="neutral"
                      className="text-[11px] font-bold"
                    >
                      거절됨
                    </Badge>
                  )}
                  {user.status === 'withdrawn' && (
                    <Badge
                      variant="subtle"
                      color="neutral"
                      className="text-[11px] font-bold"
                    >
                      탈퇴함
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-caption text-muted-foreground block font-medium">
                    {user.phoneNumber}
                  </span>
                  {user.department && (
                    <span className="text-caption text-muted-foreground flex items-center gap-0.5 font-medium">
                      <BuildingOfficeIcon className="h-3 w-3 shrink-0" />
                      {user.department}
                    </span>
                  )}
                </div>
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
        {/* 탭 + 소속 관리 버튼 */}
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="scrollbar-hide flex flex-1 gap-1.5 overflow-x-auto">
            {(['승인 대기', '전체 사용자'] as TabType[]).map((tab) => (
              <Chip
                key={tab}
                variant={activeTab === tab ? 'active' : 'inactive'}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === '승인 대기' && pendingUsers.length > 0 && (
                  <span className="ml-1 opacity-80">
                    · {pendingUsers.length}
                  </span>
                )}
              </Chip>
            ))}
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="space-y-2 px-5 pb-5">
          {activeTab === '전체 사용자' && (
            <div className="flex items-center justify-between pb-3">
              <span className="text-body-sm text-muted-foreground font-medium">
                소속
              </span>{' '}
              <div className="flex items-center gap-0.5">
                <div className="relative min-w-[150px]">
                  <Select
                    value={selectedDeptFilter}
                    onValueChange={setSelectedDeptFilter}
                    size="small"
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="unassigned">미지정</SelectItem>
                      {departments.map((dept) => {
                        const memberCount =
                          departmentGroups.find(([k]) => k === dept.name)?.[1]
                            .length ?? 0;
                        return (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name} ({memberCount})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 소속 관리 버튼 */}
                <button
                  onClick={() => router.push('/admin/departments')}
                  className="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-neutral-200 active:bg-neutral-300"
                  aria-label="소속 관리"
                  title="소속 관리"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
          {activeTab === '승인 대기'
            ? renderPending()
            : renderUserList(currentUsers)}
        </div>
      </main>

      {/* ── 사용자 액션 드로어 ─────────────────────── */}
      <Drawer
        open={!!menuUser}
        onOpenChange={(open) => {
          if (!open) {
            setMenuUser(null);
            setMoreMenuOpen(false);
          }
        }}
      >
        <DrawerContent>
          {menuUser && (
            <>
              <DrawerTitle className="sr-only">
                {menuUser.name} 설정
              </DrawerTitle>

              {/* 프로필 정보 */}
              <div className="relative mx-4 mt-2 mb-4">
                <div className="bg-muted/50 rounded-lg px-4 py-4">
                  <div className="space-y-2.5">
                    {(
                      [
                        { label: '이름', value: menuUser.name },
                        { label: '아이디', value: menuUser.username || '-' },
                        { label: '전화번호', value: menuUser.phoneNumber },
                        { label: '소속', value: menuUser.department || '-' },
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

                {/* 더보기 메뉴 */}
                <div className="absolute top-2 right-2">
                  <button
                    className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-neutral-200 active:bg-neutral-300"
                    onClick={() => setMoreMenuOpen((v) => !v)}
                    aria-label="더보기"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </button>
                  {moreMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMoreMenuOpen(false)}
                      />
                      <div className="bg-card border-border/40 absolute top-9 right-0 z-20 min-w-[160px] overflow-hidden rounded-md border shadow-lg">
                        <button
                          className="text-danger hover:bg-danger-subtle flex w-full items-center gap-2.5 px-4 py-3 text-[14px] font-medium transition-colors"
                          onClick={() => {
                            setMoreMenuOpen(false);
                            callDelete(menuUser.id, menuUser.name);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                          계정 삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 토글 액션 */}
              <div className="px-5 pb-8">
                <div className="border-border-subtle/50 mb-6 space-y-0">
                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <span className="text-foreground block text-[15px] font-semibold">
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
                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <span className="text-foreground block text-[15px] font-semibold">
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

                {/* 강제 수정 액션 */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="large"
                    className="w-full"
                    onClick={() => {
                      router.push(`/admin/users/${menuUser.id}/edit`);
                    }}
                  >
                    정보 수정
                  </Button>
                  <Button
                    variant="subtle"
                    color="secondary"
                    size="large"
                    className="w-full"
                    onClick={() => {
                      const newPassword = window.prompt(
                        '재설정할 비밀번호를 입력하세요 (최소 4자)'
                      );
                      if (newPassword && newPassword.length >= 4) {
                        callPatch(menuUser.id, {
                          action: 'reset-password',
                          newPassword,
                        });
                        alert('비밀번호가 변경되었습니다.');
                      } else if (newPassword) {
                        alert('비밀번호는 4자 이상이어야 합니다.');
                      }
                    }}
                  >
                    비밀번호 재설정
                  </Button>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
