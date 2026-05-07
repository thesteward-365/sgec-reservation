'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightStartOnRectangleIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BrandHeader } from '@/components/layout/brand-header';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { List, ListItem } from '@/components/ui/list';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/utils';
import { AccountDialog, GuideDialog, PurposeDialog } from './settings-dialogs';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  version: string;
};

type AccountForm = { name: string; phoneNumber: string };

const STORAGE_PURPOSES = 'frequent-purposes';
const MAX_PURPOSE_COUNT = 3;

function getStoredPurposes() {
  try {
    const saved = localStorage.getItem(STORAGE_PURPOSES);
    return saved ? (JSON.parse(saved) as string[]) : [];
  } catch {
    return [];
  }
}

export function SettingsView({
  name: initialName,
  phoneNumber: initialPhoneNumber,
  role,
  version,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState(
    formatPhoneNumber(initialPhoneNumber)
  );
  const [purposes, setPurposes] = useState<string[]>([]);
  const [isLoadingPurposes, setIsLoadingPurposes] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showPurposeDialog, setShowPurposeDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [accountForm, setAccountForm] = useState<AccountForm>({
    name: initialName,
    phoneNumber: formatPhoneNumber(initialPhoneNumber),
  });
  const [isSavingPurpose, setIsSavingPurpose] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  function savePurposes(nextPurposes: string[]) {
    setPurposes(nextPurposes);
    localStorage.setItem(STORAGE_PURPOSES, JSON.stringify(nextPurposes));
  }

  function handleOpenAccountDialog() {
    setAccountForm({ name, phoneNumber });
    setShowAccountDialog(true);
  }

  function handleRemovePurpose(targetPurpose: string) {
    savePurposes(purposes.filter((purpose) => purpose !== targetPurpose));
    toast.success('목적을 삭제했어요.');
  }

  function handleSavePurpose() {
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
    savePurposes([...purposes, trimmedPurpose]);
    setNewPurpose('');
    setShowPurposeDialog(false);
    setIsSavingPurpose(false);
    toast.success('목적을 추가했어요.');
  }

  useEffect(() => {
    setPurposes(getStoredPurposes());
    setIsLoadingPurposes(false);
  }, []);

  async function handleSaveAccount() {
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

    setIsSavingAccount(true);

    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phoneNumber: trimmedPhoneNumber,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: AccountForm;
      };

      if (!response.ok) {
        toast.error(data.error ?? '계정 정보 저장에 실패했어요.');
        return;
      }

      setName(data.user?.name ?? trimmedName);
      setPhoneNumber(
        formatPhoneNumber(data.user?.phoneNumber ?? trimmedPhoneNumber)
      );
      setShowAccountDialog(false);
      toast.success('계정 정보를 저장했어요.');
      router.refresh();
    } catch {
      toast.error('계정 정보 저장에 실패했어요.');
    } finally {
      setIsSavingAccount(false);
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
              onClick={handleOpenAccountDialog}
              className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-neutral-50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-body text-foreground font-bold">
                    {name}
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
                <span className="text-muted-foreground block text-[14px] font-medium">
                  {phoneNumber}
                </span>
              </div>
              <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
            </button>
          </ListItem>
        </List>

        {/* 빠른 목적 섹션 */}
        <div className="bg-card rounded-xl p-5 shadow-(--shadow-1)">
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

          <div className="rounded-2xl bg-neutral-50 px-4 py-4">
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
              variant="secondary"
              size="md"
              className="mt-4 h-11 w-full rounded-xl"
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
        </List>

        {/* 로그아웃 섹션 */}
        <div className="bg-card rounded-xl shadow-(--shadow-1)">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 transition-colors hover:bg-neutral-50"
          >
            <ArrowRightStartOnRectangleIcon className="text-destructive size-5" />
            <span className="text-destructive flex-1 text-left text-[15px] font-semibold">
              로그아웃
            </span>
          </button>
        </div>

        <p className="text-muted-foreground pt-2 text-center text-[12px]">
          v{version} · 샘깊은교회 문화사역 장소방
        </p>
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
      <AccountDialog
        open={showAccountDialog}
        form={accountForm}
        disabled={isSavingAccount}
        onOpenChange={setShowAccountDialog}
        onFormChange={setAccountForm}
        onSave={handleSaveAccount}
        onCancel={() => setShowAccountDialog(false)}
      />
      <GuideDialog open={showGuide} onOpenChange={setShowGuide} />
    </>
  );
}
