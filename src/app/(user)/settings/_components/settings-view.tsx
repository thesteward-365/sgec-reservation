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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BrandHeader } from '@/components/layout/brand-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SettingsActionRow } from './settings-action-row';
import { AccountDialog, GuideDialog, PurposeDialog } from './settings-dialogs';
import { SettingsProfileCard } from './settings-profile-card';

type Props = {
  name: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  version: string;
};

type AccountForm = { name: string; phoneNumber: string };

const STORAGE_PURPOSES = 'frequent-purposes';
const MAX_PURPOSE_COUNT = 3;

export function SettingsView({
  name: initialName,
  phoneNumber: initialPhoneNumber,
  role,
  version,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showPurposeDialog, setShowPurposeDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [accountForm, setAccountForm] = useState<AccountForm>({
    name: initialName,
    phoneNumber: initialPhoneNumber,
  });
  const [isSavingPurpose, setIsSavingPurpose] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PURPOSES);
      if (saved) setPurposes(JSON.parse(saved) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

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

  async function handleSaveAccount() {
    const trimmedName = accountForm.name.trim();
    const trimmedPhoneNumber = accountForm.phoneNumber.trim();

    if (!trimmedName || !trimmedPhoneNumber) {
      toast.error('이름과 휴대전화번호를 입력해주세요.');
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
      setPhoneNumber(data.user?.phoneNumber ?? trimmedPhoneNumber);
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

      <div className="flex flex-col gap-4 px-5 pb-32">
        <Card className="bg-card rounded-3xl p-0 shadow-(--shadow-1)">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle>계정 관리</CardTitle>
            <CardDescription>
              계정 정보를 최신 상태로 유지해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-5 pb-5">
            <div className="rounded-2xl bg-neutral-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-3">
                <span className="text-muted-foreground text-[13px] font-medium">
                  이름
                </span>
                <span className="text-foreground text-[15px] font-semibold">
                  {name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 pt-3">
                <span className="text-muted-foreground text-[13px] font-medium">
                  휴대전화번호
                </span>
                <span className="text-foreground text-[15px] font-semibold">
                  {phoneNumber}
                </span>
              </div>
            </div>

            <SettingsActionRow
              icon={<PencilSquareIcon />}
              label="계정 정보 수정"
              description="이름과 휴대전화번호를 변경할 수 있어요."
              onClick={handleOpenAccountDialog}
            />
            {role === 'admin' && (
              <SettingsActionRow
                icon={<ShieldCheckIcon />}
                label="관리자 페이지로 이동"
                description="예약 현황과 설정을 관리할 수 있어요."
                onClick={() => router.push('/admin')}
              />
            )}
            <SettingsActionRow
              icon={<InformationCircleIcon />}
              label="이용 안내"
              description="예약 규칙과 이용 방법을 확인할 수 있어요."
              onClick={() => setShowGuide(true)}
            />
            <SettingsActionRow
              icon={<ArrowRightStartOnRectangleIcon />}
              label="로그아웃"
              description="현재 계정에서 안전하게 로그아웃합니다."
              onClick={handleLogout}
              danger
            />
          </CardContent>
        </Card>
        <Card className="bg-card rounded-3xl p-0 shadow-(--shadow-1)">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle>빠른 목적</CardTitle>
            <CardDescription>
              공간 예약 시 빠르게 선택할 수 있는 목적을 최대 3개까지
              <br />
              등록해보세요
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="rounded-2xl bg-neutral-50 px-4 py-4">
              {purposes.length === 0 ? (
                <p className="text-muted-foreground text-[13px]">
                  아직 등록된 목적이 없습니다.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {purposes.map((purpose) => (
                    <span
                      key={purpose}
                      className="text-foreground bg-background shadow-1 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium"
                    >
                      {purpose}
                      <button
                        onClick={() => handleRemovePurpose(purpose)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`${purpose} 삭제`}
                        type="button"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <Button
                variant="secondary"
                size="md"
                className="mt-4 h-11 w-full"
                onClick={() => setShowPurposeDialog(true)}
                disabled={purposes.length >= MAX_PURPOSE_COUNT}
              >
                <PlusIcon className="size-4" />
                {purposes.length >= MAX_PURPOSE_COUNT
                  ? '최대 3개 등록됨'
                  : '목적 추가'}
              </Button>
            </div>
          </CardContent>
        </Card>

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
