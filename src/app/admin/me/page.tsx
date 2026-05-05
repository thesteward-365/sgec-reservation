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
              <div className="animate-pulse space-y-2">
                <div className="bg-muted h-5 w-24 rounded" />
                <div className="bg-muted h-4 w-36 rounded" />
              </div>
            ) : me && !isEditing ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-body text-foreground font-bold">
                        {me.name}
                      </span>
                      {me.role === 'admin' && (
                        <Badge
                          variant="subtle"
                          color="blue"
                          className="text-xs"
                        >
                          관리자
                        </Badge>
                      )}
                    </div>
                    <span className="text-body-sm text-muted-foreground block">
                      {me.phoneNumber}
                    </span>
                  </div>
                  <button
                    className="text-caption text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl px-3 py-2 transition-colors"
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
                  <span className="text-caption text-muted-foreground block">
                    이름
                  </span>
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-caption text-muted-foreground block">
                    전화번호
                  </span>
                  <Input
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    className="h-10"
                  />
                </div>
                {error && (
                  <span className="text-caption block text-red-500">
                    {error}
                  </span>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={saving}
                    onClick={handleSave}
                    className="rounded-pill bg-primary text-body-sm hover:bg-accent-hover flex-1 py-2.5 font-semibold text-white transition-colors disabled:opacity-50"
                  >
                    {saving ? '저장 중…' : '저장'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                    }}
                    className="rounded-pill border-border text-body-sm text-muted-foreground hover:text-foreground flex-1 border py-2.5 font-semibold transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* 메뉴 섹션 */}
          <div className="bg-card overflow-hidden rounded-2xl">
            <Link
              href="/reserve"
              className="hover:bg-muted flex items-center gap-3 px-4 py-3.5 transition-colors"
            >
              <UserIcon className="text-foreground size-5" />
              <span className="text-body-sm text-foreground flex-1 font-semibold">
                사용자 페이지로 이동
              </span>
              <ChevronRightIcon className="text-muted-foreground h-4 w-4" />
            </Link>

            <div className="bg-muted/60 mx-4 h-px" />

            <Link
              href="/admin/calendar"
              className="hover:bg-muted flex items-center gap-3 px-4 py-3.5 transition-colors"
            >
              <CalendarDaysIcon className="text-foreground size-5" />
              <span className="text-body-sm text-foreground flex-1 font-semibold">
                Google Calendar 연동
              </span>
              <ChevronRightIcon className="text-muted-foreground h-4 w-4" />
            </Link>
          </div>

          {/* 로그아웃 */}
          <div className="bg-card rounded-2xl">
            <button
              onClick={handleLogout}
              className="hover:bg-muted flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors"
            >
              <ArrowRightStartOnRectangleIcon className="text-destructive size-5" />
              <span className="text-body-sm text-destructive flex-1 text-left font-semibold">
                로그아웃
              </span>
            </button>
          </div>

          {/* 버전 */}
          <div className="pt-2 text-center">
            <span className="text-caption text-muted-foreground block">
              v1.0.0 · 샘깊은교회 문화사역 장소방
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
