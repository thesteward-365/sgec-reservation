'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightStartOnRectangleIcon,
  InformationCircleIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  ChevronRightIcon,
  UserMinusIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BrandHeader } from '@/components/layout/brand-header';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { GuideDialog, PurposeDialog, WithdrawDialog } from './settings-dialogs';
import { AppVersion } from '@/components/layout/app-version';

type Props = {
  name: string;
  username: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  version: string;
};

const MAX_PURPOSE_COUNT = 3;

export function SettingsView({ name, username, role, version }: Props) {
  const router = useRouter();
  const [purposes, setPurposes] = useState<string[]>([]);
  const [isLoadingPurposes, setIsLoadingPurposes] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showPurposeDialog, setShowPurposeDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [isSavingPurpose, setIsSavingPurpose] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  async function fetchPurposes() {
    setIsLoadingPurposes(true);
    try {
      const response = await fetch('/api/purposes');
      const data = (await response.json()) as { purposes: string[] };
      setPurposes(data.purposes || []);
    } catch {
      toast.error('목적을 불러오는데 실패했어요.');
    } finally {
      setIsLoadingPurposes(false);
    }
  }

  async function handleRemovePurpose(targetPurpose: string) {
    try {
      const response = await fetch(
        `/api/purposes?purpose=${encodeURIComponent(targetPurpose)}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) throw new Error();
      setPurposes(purposes.filter((purpose) => purpose !== targetPurpose));
      toast.success('목적을 삭제했어요.');
    } catch {
      toast.error('목적 삭제에 실패했어요.');
    }
  }

  async function handleSavePurpose() {
    const trimmedPurpose = newPurpose.trim();
    if (!trimmedPurpose) {
      toast.error('목적을 입력해주세요.');
      return;
    }

    if (purposes.includes(trimmedPurpose)) {
      toast.error('이미 등록된 목적입니다.');
      return;
    }

    if (purposes.length >= MAX_PURPOSE_COUNT) {
      toast.error('목적은 최대 3개까지 등록할 수 있어요.');
      return;
    }

    setIsSavingPurpose(true);
    try {
      const response = await fetch('/api/purposes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: trimmedPurpose }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? '목적 추가에 실패했어요.');
        return;
      }

      setPurposes([...purposes, trimmedPurpose]);
      setNewPurpose('');
      setShowPurposeDialog(false);
      toast.success('목적을 추가했어요.');
    } catch {
      toast.error('목적 추가에 실패했어요.');
    } finally {
      setIsSavingPurpose(false);
    }
  }

  useEffect(() => {
    async function migrateAndFetch() {
      const saved = localStorage.getItem('frequent-purposes');
      if (saved) {
        try {
          const localPurposes = JSON.parse(saved) as string[];
          for (const p of localPurposes) {
            await fetch('/api/purposes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ purpose: p }),
            });
          }
          localStorage.removeItem('frequent-purposes');
        } catch {
          // Ignore migration errors
        }
      }
      fetchPurposes();
    }
    migrateAndFetch();
  }, []);

  async function handleConfirmWithdraw() {
    setIsWithdrawing(true);
    try {
      const response = await fetch('/api/account/withdraw', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast.success('탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || '회원 탈퇴에 실패했어요.');
    } finally {
      setIsWithdrawing(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      <BrandHeader />
      <div className="px-5 pt-1 pb-3">
        <h2 className="text-h2 text-foreground font-bold">설정</h2>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-10">
        {/* 프로필 섹션 */}
        <List>
          <ListItem className="px-0 py-0">
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
                      {username}
                    </span>
                    {role === 'admin' && (
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
                    {name}님
                  </span>
                </div>
              </div>
              <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
            </button>
          </ListItem>
        </List>

        {/* 빠른 목적 섹션 */}
        <div className="bg-card rounded-lg p-5 shadow-(--shadow-1)">
          <div className="mb-4">
            <p className="text-foreground text-[15px] font-bold">
              자주 사용하는 목적
            </p>
            <p className="text-muted-foreground! mt-1 text-[13px] leading-snug">
              공간 예약 시 빠르게 선택할 수 있도록, <br />
              자주 사용하는 목적을 최대 3개까지 등록해보세요.
              {`(ex: 청년부 모임)`}
            </p>
          </div>

          <div className="rounded-lg bg-neutral-50 px-4 py-4">
            {isLoadingPurposes ? (
              <ListSkeleton count={2} className="bg-transparent shadow-none" />
            ) : purposes.length === 0 ? (
              <p className="text-muted-foreground text-[13px]">
                아직 등록된 목적이 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {purposes.map((purpose) => (
                  <Chip
                    key={purpose}
                    size="sm"
                    variant="inactive"
                    className="gap-2"
                    onClick={() => handleRemovePurpose(purpose)}
                    aria-label={`${purpose} 삭제`}
                  >
                    {purpose}
                    <TrashIcon className="size-3.5" />
                  </Chip>
                ))}
              </div>
            )}

            <Button
              variant="subtle"
              color="primary"
              size="medium"
              className="mt-4 w-full"
              onClick={() => setShowPurposeDialog(true)}
              disabled={purposes.length >= MAX_PURPOSE_COUNT}
            >
              <PlusIcon className="size-4" />
              {purposes.length >= MAX_PURPOSE_COUNT
                ? '최대 3개 등록됨'
                : '목적 추가'}
            </Button>
          </div>
        </div>

        {/* 메뉴 섹션 */}
        <List>
          {role === 'admin' && (
            <ListItem className="px-0 py-0">
              <button
                onClick={() => router.push('/admin')}
                className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50"
              >
                <ShieldCheckIcon className="text-foreground size-5" />
                <span className="text-foreground flex-1 text-left text-[15px] font-semibold">
                  관리자 페이지로 이동
                </span>
                <ChevronRightIcon className="text-muted-foreground size-4" />
              </button>
            </ListItem>
          )}

          <ListItem className="px-0 py-0">
            <button
              onClick={() => setShowGuide(true)}
              className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50"
            >
              <InformationCircleIcon className="text-foreground size-5" />
              <span className="text-foreground flex-1 text-left text-[15px] font-semibold">
                이용 안내
              </span>
              <ChevronRightIcon className="text-muted-foreground size-4" />
            </button>
          </ListItem>

          <ListItem className="border-b-0 px-0 py-0">
            <button
              onClick={() => router.push('/privacy')}
              className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50"
            >
              <ShieldCheckIcon className="text-foreground size-5" />
              <span className="text-foreground flex-1 text-left text-[15px] font-semibold">
                개인정보 처리방침
              </span>
              <ChevronRightIcon className="text-muted-foreground size-4" />
            </button>
          </ListItem>
        </List>

        {/* 로그아웃 및 탈퇴 섹션 */}
        <List className="mt-2">
          <ListItem className="px-0 py-0">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50"
            >
              <ArrowRightStartOnRectangleIcon className="text-foreground size-5" />
              <span className="text-foreground flex-1 text-left text-[15px] font-semibold">
                로그아웃
              </span>
            </button>
          </ListItem>
          <ListItem className="border-b-0 px-0 py-0">
            <button
              onClick={() => setShowWithdrawDialog(true)}
              className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50"
            >
              <UserMinusIcon className="text-destructive size-5" />
              <span className="text-destructive flex-1 text-left text-[15px] font-semibold">
                회원 탈퇴
              </span>
            </button>
          </ListItem>
        </List>

        <AppVersion />
      </div>

      <PurposeDialog
        open={showPurposeDialog}
        value={newPurpose}
        disabled={isSavingPurpose}
        onOpenChange={setShowPurposeDialog}
        onChange={setNewPurpose}
        onSave={handleSavePurpose}
        onCancel={() => {
          setNewPurpose('');
          setShowPurposeDialog(false);
        }}
      />
      <WithdrawDialog
        open={showWithdrawDialog}
        disabled={isWithdrawing}
        onOpenChange={setShowWithdrawDialog}
        onConfirm={handleConfirmWithdraw}
        onCancel={() => setShowWithdrawDialog(false)}
      />
      <GuideDialog open={showGuide} onOpenChange={setShowGuide} />
    </>
  );
}
