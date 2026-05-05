'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/layout/brand-header';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  UserIcon,
  CalendarDaysIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronRightIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/utils';
import { AccountDialog } from '@/app/(user)/settings/_components/settings-dialogs';
import Link from 'next/link';

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
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', phoneNumber: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/account')
      .then((r) => r.json())
      .then((data: { user: Me }) => {
        setMe(data.user);
        setAccountForm({
          name: data.user.name,
          phoneNumber: formatPhoneNumber(data.user.phoneNumber),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveAccount() {
    if (!me) return;

    const trimmedName = accountForm.name.trim();
    const trimmedPhoneNumber = normalizePhoneNumber(accountForm.phoneNumber);

    if (!trimmedName || !trimmedPhoneNumber) {
      toast.error('이름과 휴대전화번호를 입력해주세요.');
      return;
    }

    if (trimmedPhoneNumber.length !== 11) {
      toast.error('전화번호 11자리를 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phoneNumber: trimmedPhoneNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? '저장에 실패했습니다.');
        return;
      }
      setMe(data.user);
      setShowAccountDialog(false);
      toast.success('계정 정보를 저장했어요.');
      router.refresh();
    } catch (error) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-24">
        <div className="space-y-4 px-5 pt-4 pb-5">
          {/* 프로필 섹션 */}
          <div className="bg-card overflow-hidden rounded-xl shadow-(--shadow-1)">
            {loading ? (
              <div className="animate-pulse space-y-3 p-5">
                <div className="bg-muted h-6 w-24 rounded-lg" />
                <div className="bg-muted h-4 w-36 rounded-lg" />
              </div>
            ) : me ? (
              <button
                onClick={() => {
                  setAccountForm({
                    name: me.name,
                    phoneNumber: formatPhoneNumber(me.phoneNumber),
                  });
                  setShowAccountDialog(true);
                }}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-neutral-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body text-foreground font-bold">
                      {me.name}
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
                  <span className="text-muted-foreground block text-[14px] font-medium">
                    {formatPhoneNumber(me.phoneNumber)}
                  </span>
                </div>
                <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
              </button>
            ) : null}
          </div>

          {/* 메뉴 섹션 */}
          <div className="bg-card overflow-hidden rounded-xl shadow-(--shadow-1)">
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
          </div>

          {/* 로그아웃 */}
          <div className="bg-card rounded-xl shadow-(--shadow-1)">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-5 py-4 transition-colors hover:bg-neutral-50"
            >
              <ArrowRightStartOnRectangleIcon className="text-destructive size-5" />
              <span className="text-destructive flex-1 text-left text-[15px] font-semibold">
                로그아웃
              </span>
            </button>
          </div>

          {/* 버전 */}
          <div className="pt-2 text-center">
            <span className="text-muted-foreground block text-[12px]">
              v1.0.0 · 샘깊은교회 문화사역 장소방
            </span>
          </div>
        </div>
      </main>

      <AccountDialog
        open={showAccountDialog}
        form={accountForm}
        disabled={saving}
        onOpenChange={setShowAccountDialog}
        onFormChange={setAccountForm}
        onSave={handleSaveAccount}
        onCancel={() => setShowAccountDialog(false)}
      />
    </>
  );
}
