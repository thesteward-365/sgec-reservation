'use client';

import { useState } from 'react';
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
      <DialogContent className="max-h-[95dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>목적 추가</DialogTitle>
          <DialogDescription>
            자주 사용하는 목적을 등록해두면 예약할 때 더 빠르게 선택할 수
            있어요.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="예: 청년부 모임"
            maxLength={20}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSave();
            }}
            autoFocus
          />
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={onSave}
            disabled={disabled}
            className="order-1 w-full sm:order-2 sm:w-auto"
          >
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
      <DialogContent className="max-h-[95dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>계정 정보 수정</DialogTitle>
          <DialogDescription>
            로그인에 사용하는 이름과 휴대전화번호를 수정할 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-1.5">
            <label className="text-caption text-muted-foreground ml-1">
              이름
            </label>
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
          </div>
          <div className="space-y-1.5">
            <label className="text-caption text-muted-foreground ml-1">
              휴대전화번호
            </label>
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
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={onSave}
            disabled={disabled}
            className="order-1 w-full sm:order-2 sm:w-auto"
          >
            저장
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="order-2 w-full sm:order-1 sm:w-auto"
          >
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PasswordDialogProps = {
  open: boolean;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (currentPassword: string, newPassword: string) => void;
  onCancel: () => void;
};

export function PasswordDialog({
  open,
  disabled,
  onOpenChange,
  onSave,
  onCancel,
}: PasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <DialogDescription>
            보안을 위해 비밀번호를 주기적으로 변경해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-1.5">
            <label className="text-caption text-muted-foreground ml-1">
              현재 비밀번호
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(event.target.value)}
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
              onChange={(e) => setNewPassword(event.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-caption text-muted-foreground ml-1">
              새 비밀번호 확인
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(event.target.value)}
              placeholder="새 비밀번호 다시 입력"
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={() => {
              if (newPassword !== confirmPassword) {
                alert('새 비밀번호가 일치하지 않습니다.');
                return;
              }
              onSave(currentPassword, newPassword);
            }}
            disabled={disabled || !currentPassword || !newPassword || !confirmPassword}
            className="order-1 w-full sm:order-2 sm:w-auto"
          >
            변경하기
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              onCancel();
            }}
            className="order-2 w-full sm:order-1 sm:w-auto"
          >
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type WithdrawDialogProps = {
  open: boolean;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function WithdrawDialog({
  open,
  disabled,
  onOpenChange,
  onConfirm,
  onCancel,
}: WithdrawDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">회원 탈퇴</DialogTitle>
          <DialogDescription>
            정말로 탈퇴하시겠습니까? 탈퇴 시 계정 정보는 복구할 수 없으며, 기존 예약 내역의 개인정보는 익명화됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={disabled}
            className="order-1 w-full sm:order-2 sm:w-auto"
          >
            탈퇴하기
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="order-2 w-full sm:order-1 sm:w-auto"
          >
            취소
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
