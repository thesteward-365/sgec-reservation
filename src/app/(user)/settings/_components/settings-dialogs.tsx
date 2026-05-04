'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatPhoneNumber } from '@/lib/utils';

type AccountForm = {
  name: string;
  phoneNumber: string;
};

type PurposeDialogProps = {
  open: boolean;
  value: string;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function PurposeDialog({
  open,
  value,
  disabled,
  onOpenChange,
  onChange,
  onSave,
  onCancel,
}: PurposeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>목적 추가</DialogTitle>
          <DialogDescription>
            자주 사용하는 목적을 등록해두면 예약할 때 더 빠르게 선택할 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="예: 청년부 모임"
          maxLength={20}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSave();
          }}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={onSave} disabled={disabled}>
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AccountDialogProps = {
  open: boolean;
  form: AccountForm;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: AccountForm) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function AccountDialog({
  open,
  form,
  disabled,
  onOpenChange,
  onFormChange,
  onSave,
  onCancel,
}: AccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계정 정보 수정</DialogTitle>
          <DialogDescription>
            로그인에 사용하는 이름과 휴대전화번호를 수정할 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            value={form.name}
            onChange={(event) =>
              onFormChange({
                ...form,
                name: event.target.value,
              })
            }
            placeholder="이름"
          />
          <Input
            value={form.phoneNumber}
            onChange={(event) =>
              onFormChange({
                ...form,
                phoneNumber: formatPhoneNumber(event.target.value),
              })
            }
            placeholder="010-0000-0000"
            type="tel"
            inputMode="numeric"
            maxLength={13}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={onSave} disabled={disabled}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type GuideDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GuideDialog({ open, onOpenChange }: GuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이용 안내</DialogTitle>
          <DialogDescription>
            예약 전에 아래 내용을 한 번 확인해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="text-foreground flex flex-col gap-2 text-[14px] leading-relaxed">
          <p>• 장소 예약은 30분 단위로 진행됩니다.</p>
          <p>• 예약 후 취소 또는 시간 변경이 가능합니다.</p>
          <p>• 다른 예약과 시간이 겹칠 경우 예약이 불가합니다.</p>
          <p>• 문의사항은 담당 사역자에게 연락해 주세요.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
