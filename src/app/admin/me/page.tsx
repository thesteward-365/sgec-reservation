'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/layout/brand-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  UserIcon,
  CalendarDaysIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Me {
  id: number;
  name: string;
  phoneNumber: string;
  role: 'user' | 'admin';
}

export default function AdminMePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/account')
      .then((r) => r.json())
      .then((data: { user: Me }) => {
        setMe(data.user);
        setTempName(data.user.name);
        setTempPhone(data.user.phoneNumber);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!me) return;
    setSaving(true);
    setError(null);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tempName, phoneNumber: tempPhone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? '저장에 실패했습니다.');
      setSaving(false);
      return;
    }
    setMe(data.user);
    setIsEditing(false);
    setSaving(false);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-24">
        <div className="space-y-3 px-5 pt-4 pb-5">
          {/* 프로필 섹션 */}
          <div className="bg-card rounded-2xl px-4 py-4">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="bg-muted h-5 w-24 rounded" />
                <div className="bg-muted h-4 w-36 rounded" />
              </div>
            ) : me && !isEditing ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-bold text-foreground">{me.name}</span>
                      {me.role === 'admin' && (
                        <Badge variant="subtle" color="blue" className="text-xs">
                          관리자
                        </Badge>
                      )}
                    </div>
                    <span className="block text-body-sm text-muted-foreground">
                      {me.phoneNumber}
                    </span>
                  </div>
                  <button
                    className="text-caption text-muted-foreground rounded-xl px-3 py-2 transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setTempName(me.name);
                      setTempPhone(me.phoneNumber);
                      setIsEditing(true);
                    }}
                  >
                    수정
                  </button>
                </div>
              </>
            ) : me && isEditing ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="block text-caption text-muted-foreground">이름</span>
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-caption text-muted-foreground">전화번호</span>
                  <Input
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    className="h-10"
                  />
                </div>
                {error && (
                  <span className="block text-caption text-red-500">{error}</span>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={saving}
                    onClick={handleSave}
                    className="rounded-pill bg-primary flex-1 py-2.5 text-body-sm font-semibold text-white transition-colors disabled:opacity-50 hover:bg-accent-hover"
                  >
                    {saving ? '저장 중…' : '저장'}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setError(null); }}
                    className="rounded-pill border-border flex-1 border py-2.5 text-body-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* 메뉴 섹션 */}
          <div className="bg-card rounded-2xl overflow-hidden">
            <Link
              href="/reserve"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                <UserIcon className="h-4 w-4 text-blue-600" />
              </div>
              <span className="flex-1 text-body-sm font-semibold text-foreground">
                사용자 페이지로 이동
              </span>
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            </Link>

            <div className="mx-4 h-px bg-muted/60" />

            <Link
              href="/admin/calendar"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-100">
                <CalendarDaysIcon className="h-4 w-4 text-green-600" />
              </div>
              <span className="flex-1 text-body-sm font-semibold text-foreground">
                Google Calendar 연동
              </span>
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          {/* 로그아웃 */}
          <div className="bg-card rounded-2xl">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted rounded-2xl"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100">
                <ArrowRightStartOnRectangleIcon className="h-4 w-4 text-red-500" />
              </div>
              <span className="flex-1 text-left text-body-sm font-semibold text-red-500">
                로그아웃
              </span>
            </button>
          </div>

          {/* 버전 */}
          <div className="pt-2 text-center">
            <span className="block text-caption text-muted-foreground">
              v1.0.0 · 샘깊은교회 문화사역 장소방
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
