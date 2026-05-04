'use client';

import { useEffect, useState } from 'react';
import { BrandHeader } from '@/components/layout/brand-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  name: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const TABS = ['승인 대기', '전체 사용자'] as const;
type TabType = (typeof TABS)[number];

// 더미 데이터
const PENDING_USERS: User[] = [
  {
    id: 1,
    name: '홍길동',
    phoneNumber: '010-1234-5678',
    role: 'user',
    status: 'pending',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    name: '김철수',
    phoneNumber: '010-2345-6789',
    role: 'user',
    status: 'pending',
    createdAt: '2024-01-14T14:20:00Z',
  },
];

const ALL_USERS: User[] = [
  ...PENDING_USERS,
  {
    id: 3,
    name: '관리자',
    phoneNumber: '010-3456-7890',
    role: 'admin',
    status: 'approved',
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    id: 4,
    name: '정연희',
    phoneNumber: '010-4567-8901',
    role: 'admin',
    status: 'approved',
    createdAt: '2024-01-12T11:15:00Z',
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  }
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('승인 대기');
  const [pendingUsers, setPendingUsers] = useState<User[]>(PENDING_USERS);
  const [allUsers, setAllUsers] = useState<User[]>(ALL_USERS);

  const handleApprove = async (userId: number) => {
    // 실제 API 호출
    setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: 'approved' as const } : u
      )
    );
  };

  const handleReject = async (userId: number) => {
    // 실제 API 호출
    setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: 'rejected' as const } : u
      )
    );
  };

  const renderPendingUsers = () => (
    <div className="space-y-4">
      {pendingUsers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-body-medium text-muted-foreground">
            승인 대기 중인 사용자가 없습니다
          </p>
        </Card>
      ) : (
        pendingUsers.map((user) => (
          <Card key={user.id} className="p-5">
            <div className="flex items-center gap-4">
              {/* 아바타 */}
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                <span className="text-body-medium text-muted-foreground font-semibold">
                  {getInitials(user.name)}
                </span>
              </div>

              {/* 사용자 정보 */}
              <div className="flex-1">
                <h3 className="text-body-medium font-semibold">{user.name}</h3>
                <p className="text-body-small text-muted-foreground">
                  {user.phoneNumber}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <ClockIcon className="text-muted-foreground h-3 w-3" />
                  <span className="text-body-small text-muted-foreground">
                    {formatTimeAgo(user.createdAt)} 요청
                  </span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleReject(user.id)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircleIcon className="mr-1 h-4 w-4" />
                  거절
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(user.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  승인
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  const renderAllUsers = () => (
    <div className="space-y-4">
      {allUsers.map((user) => (
        <Card key={user.id} className="p-5">
          <div className="flex items-center gap-4">
            {/* 아바타 */}
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <span className="text-body-medium text-muted-foreground font-semibold">
                {getInitials(user.name)}
              </span>
            </div>

            {/* 사용자 정보 */}
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-body-medium font-semibold">{user.name}</h3>
                <Badge
                  variant="solid"
                  color={user.role === 'admin' ? 'neutral' : 'blue'}
                >
                  {user.role === 'admin' ? '관리자' : '사용자'}
                </Badge>
              </div>
              <p className="text-body-small text-muted-foreground">
                {user.phoneNumber}
              </p>
              <p className="text-body-small text-muted-foreground">
                가입일: {formatDate(user.createdAt)}
              </p>
            </div>

            {/* 상태 */}
            <div className="text-right">
              <Badge
                variant="solid"
                color={
                  user.status === 'approved'
                    ? 'green'
                    : user.status === 'pending'
                    ? 'orange'
                    : 'red'
                }
              >
                {user.status === 'approved'
                  ? '승인됨'
                  : user.status === 'pending'
                    ? '대기중'
                    : '거절됨'}
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-24">
        {/* 헤더 */}
        <div className="border-border-subtle border-b px-5 py-4">
          <h1 className="text-headline2">사용자 관리</h1>
        </div>

        {/* 탭 */}
        <div className="border-border-subtle flex border-b px-5 py-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-body-medium mr-2 rounded-lg px-4 py-2 transition-colors ${
                activeTab === tab
                  ? 'bg-fg-strong text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === '승인 대기' && pendingUsers.length > 0 && (
                <span className="ml-1 text-xs">· {pendingUsers.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="p-5">
          {activeTab === '승인 대기' ? renderPendingUsers() : renderAllUsers()}
        </div>
      </main>
    </>
  );
}
