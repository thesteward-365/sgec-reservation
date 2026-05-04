'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRightIcon,
  XMarkIcon,
  PlusIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ArrowRightStartOnRectangleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  version: string;
};

const STORAGE_PURPOSES = 'frequent-purposes';
const STORAGE_NOTIF = 'notif';

function getInitials(name: string): string {
  return name.trim().slice(0, 1);
}

type RowProps = {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
};

function ListRow({ icon, label, trailing, onClick, danger }: RowProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex w-full items-center gap-3 py-3.5 text-left',
        onClick
          ? 'px-1 hover:bg-neutral-50 active:bg-neutral-100'
          : 'cursor-default',
        danger ? 'text-destructive' : 'text-foreground'
      )}
    >
      <span
        className={cn(
          'size-5 shrink-0',
          danger ? 'text-destructive' : 'text-foreground'
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      {trailing}
      {onClick && !trailing && (
        <ChevronRightIcon className="text-muted-foreground size-4" />
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground px-0.5 pt-5 pb-1.5 text-[11px] font-medium tracking-widest uppercase">
      {children}
    </p>
  );
}

export function SettingsView({ name, phoneNumber, role, version }: Props) {
  const router = useRouter();
  const [purposes, setPurposes] = useState<string[]>([]);
  const [addingPurpose, setAddingPurpose] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PURPOSES);
      if (saved) setPurposes(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    setNotifEnabled(localStorage.getItem(STORAGE_NOTIF) === 'true');
  }, []);

  function savePurposes(next: string[]) {
    setPurposes(next);
    localStorage.setItem(STORAGE_PURPOSES, JSON.stringify(next));
  }

  function addPurpose() {
    const trimmed = newPurpose.trim();
    if (!trimmed || purposes.includes(trimmed)) {
      setNewPurpose('');
      setAddingPurpose(false);
      return;
    }
    if (purposes.length >= 3) return;
    savePurposes([...purposes, trimmed]);
    setNewPurpose('');
    setAddingPurpose(false);
  }

  function removePurpose(p: string) {
    savePurposes(purposes.filter((x) => x !== p));
  }

  function toggleNotif(val: boolean) {
    setNotifEnabled(val);
    localStorage.setItem(STORAGE_NOTIF, String(val));
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      {/* 헤더 */}
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-h2 text-foreground font-bold">설정</h2>
      </div>

      <div className="flex flex-col px-5 pb-32">
        {/* 프로필 카드 */}
        <div className="bg-card mt-3 flex items-center gap-3 rounded-2xl px-4 py-4 shadow-(--shadow-1)">
          <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-full">
            <span className="text-primary text-[16px] font-bold">
              {getInitials(name)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[16px] font-bold">{name}</p>
            <p className="text-muted-foreground text-[12px]!">{phoneNumber}</p>
          </div>
          {role === 'admin' && (
            <Badge variant="subtle" color="blue">
              관리자
            </Badge>
          )}
        </div>

        {/* 자주 사용하는 목적 */}
        <SectionLabel>자주 사용하는 목적</SectionLabel>
        <div className="bg-card flex flex-col gap-3 rounded-2xl px-4 py-4 shadow-(--shadow-1)">
          {purposes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {purposes.map((p) => (
                <span
                  key={p}
                  className="rounded-pill text-foreground flex items-center gap-1.5 bg-(--color-neutral-150) py-1.5 pr-2 pl-3 text-[13px] font-medium"
                >
                  {p}
                  <button
                    onClick={() => removePurpose(p)}
                    className="flex size-4 items-center justify-center rounded-full transition-colors hover:bg-neutral-300"
                    aria-label="삭제"
                  >
                    <XMarkIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {addingPurpose ? (
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newPurpose}
                onChange={(e) => setNewPurpose(e.target.value)}
                placeholder="목적을 입력하세요"
                className="flex-1 text-[14px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addPurpose();
                  if (e.key === 'Escape') {
                    setAddingPurpose(false);
                    setNewPurpose('');
                  }
                }}
                autoFocus
                maxLength={20}
              />
              <Button size="sm" onClick={addPurpose} className="shrink-0">
                확인
              </Button>
            </div>
          ) : purposes.length < 3 ? (
            <button
              onClick={() => {
                setAddingPurpose(true);
              }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-[13px] font-medium transition-colors"
            >
              <PlusIcon className="size-4" />
              추가하기
            </button>
          ) : (
            <p className="text-muted-foreground text-[12px]">
              최대 3개까지 등록할 수 있어요
            </p>
          )}
        </div>

        {/* 알림 */}
        <SectionLabel>알림</SectionLabel>
        <div className="bg-card divide-border-subtle divide-y rounded-2xl px-4 shadow-(--shadow-1)">
          <div className="flex items-center gap-3 py-3.5">
            <BellIcon className="text-foreground size-5 shrink-0" />
            <span className="text-foreground flex-1 text-[15px] font-medium">
              예약 알림
            </span>
            <Switch checked={notifEnabled} onCheckedChange={toggleNotif} />
          </div>
        </div>

        {/* 계정 */}
        <SectionLabel>계정</SectionLabel>
        <div className="bg-card divide-border-subtle divide-y rounded-2xl px-4 shadow-(--shadow-1)">
          {role === 'admin' && (
            <ListRow
              icon={<ShieldCheckIcon />}
              label="관리자 페이지로 이동"
              onClick={() => router.push('/admin')}
            />
          )}
          <ListRow
            icon={<InformationCircleIcon />}
            label="이용 안내"
            onClick={() => setShowGuide(true)}
          />
          <ListRow
            icon={<ArrowRightStartOnRectangleIcon />}
            label="로그아웃"
            danger
            onClick={handleLogout}
          />
        </div>

        {/* 푸터 */}
        <p className="text-muted-foreground pt-8 text-center text-[12px]">
          v{version} · 샘깊은교회 문화사역 장소방
        </p>
      </div>

      {/* 이용 안내 Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이용 안내</DialogTitle>
          </DialogHeader>
          <div className="text-foreground flex flex-col gap-2 px-1 pb-2 text-[14px] leading-relaxed">
            <p>• 장소 예약은 30분 단위로 진행됩니다.</p>
            <p>• 예약 후 취소 또는 시간 변경이 가능합니다.</p>
            <p>• 다른 예약과 시간이 겹칠 경우 예약이 불가합니다.</p>
            <p>• 문의사항은 담당 사역자에게 연락해 주세요.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
