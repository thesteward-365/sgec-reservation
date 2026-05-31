'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/utils';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { cn } from '@/lib/utils';

interface UserData {
  id: number;
  name: string;
  username: string;
  phoneNumber: string;
  role: 'user' | 'admin';
}

type TabType = 'info' | 'password';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Profile Form
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch('/api/account')
      .then((r) => r.json())
      .then((data: { user: UserData }) => {
        setUser(data.user);
        setName(data.user.name);
        setPhoneNumber(formatPhoneNumber(data.user.phoneNumber));
      })
      .catch(() => {
        toast.error('정보를 불러오지 못했습니다.');
        router.back();
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSaveProfile() {
    const trimmedName = name.trim();
    const trimmedPhone = normalizePhoneNumber(phoneNumber);

    if (!trimmedName || !trimmedPhone) {
      toast.error('이름과 휴대전화번호를 입력해주세요.');
      return;
    }
    if (trimmedPhone.length !== 11) {
      toast.error('전화번호 11자리를 입력해주세요.');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phoneNumber: trimmedPhone,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? '정보 저장에 실패했습니다.');
        return;
      }

      setUser(data.user);
      setName(data.user.name);
      setPhoneNumber(formatPhoneNumber(data.user.phoneNumber));
      toast.success('기본 정보가 저장되었습니다.');
      router.refresh();
    } catch {
      toast.error('정보 저장에 실패했습니다.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('비밀번호를 모두 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('새 비밀번호는 4자 이상이어야 합니다.');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? '비밀번호 변경에 실패했습니다.');
        return;
      }

      toast.success('비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('비밀번호 변경에 실패했습니다.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="bg-neutral-150 flex min-h-[100dvh] flex-col">
      <header className="bg-neutral-150 sticky top-0 z-10 flex h-14 items-center px-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors active:bg-neutral-200"
          aria-label="뒤로 가기"
        >
          <ChevronLeftIcon className="text-foreground h-5 w-5" />
        </button>
        <p className="text-body text-foreground flex-1 text-center font-bold!">
          개인정보
        </p>
        <div className="h-10 w-10" />
      </header>

      <main className="mx-auto flex w-full max-w-107.5 flex-1 flex-col gap-6 px-5 pt-2 pb-10">
        {loading ? (
          <ListSkeleton count={3} className="bg-transparent shadow-none" />
        ) : user ? (
          <>
            {/* Tab Switcher */}
            <div className="flex gap-1 rounded-lg bg-neutral-200 p-1 shadow-inner">
              <button
                onClick={() => setActiveTab('info')}
                className={cn(
                  'flex-1 rounded-md py-2.5 text-sm font-bold transition-all duration-200',
                  activeTab === 'info'
                    ? 'text-foreground bg-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                기본 정보
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={cn(
                  'flex-1 rounded-md py-2.5 text-sm font-bold transition-all duration-200',
                  activeTab === 'password'
                    ? 'text-foreground bg-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                비밀번호 변경
              </button>
            </div>

            {activeTab === 'info' ? (
              <section className="bg-card animate-in fade-in slide-in-from-bottom-2 rounded-lg p-5 shadow-(--shadow-1) duration-300">
                <h2 className="text-foreground mb-4 text-[15px] font-bold">
                  기본 정보 수정
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-caption text-muted-foreground ml-1">
                      아이디
                    </label>
                    <Input
                      value={user.username}
                      disabled
                      readOnly
                      className="text-muted-foreground border-transparent bg-neutral-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-caption text-muted-foreground ml-1">
                      이름
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="이름"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-caption text-muted-foreground ml-1">
                      전화번호
                    </label>
                    <Input
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(formatPhoneNumber(e.target.value))
                      }
                      placeholder="010-0000-0000"
                      type="tel"
                      inputMode="numeric"
                      maxLength={13}
                    />
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={
                      savingProfile || !name.trim() || !phoneNumber.trim()
                    }
                    variant="contained"
                    color="primary"
                    className="mt-2 w-full"
                  >
                    {savingProfile ? '저장 중...' : '기본 정보 저장'}
                  </Button>
                </div>
              </section>
            ) : (
              <section className="bg-card animate-in fade-in slide-in-from-bottom-2 rounded-lg p-5 shadow-(--shadow-1) duration-300">
                <h2 className="text-foreground mb-4 text-[15px] font-bold">
                  비밀번호 변경
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-caption text-muted-foreground ml-1">
                      현재 비밀번호
                    </label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="현재 비밀번호"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-caption text-muted-foreground ml-1">
                      새 비밀번호
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호 (4자 이상)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-caption text-muted-foreground ml-1">
                      새 비밀번호 확인
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="새 비밀번호 다시 입력"
                    />
                  </div>
                  <Button
                    onClick={handleSavePassword}
                    disabled={
                      savingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    variant="contained"
                    color="primary"
                    className="mt-2 w-full"
                  >
                    {savingPassword ? '변경 중...' : '비밀번호 변경'}
                  </Button>
                </div>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
