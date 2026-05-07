'use client';

import { Button } from '@/components/ui/button';

type Props = {
  saving: boolean;
  hasChanges: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function SortActionBar({ saving, hasChanges, onCancel, onSave }: Props) {
  return (
    <div
      className="sticky bottom-0 z-20 bg-(--color-neutral-150) mt-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-107.5 gap-3 px-5 py-4">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="flex-1 py-4 text-[15px]"
        >
          취소
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || !hasChanges}
          className="flex-1 py-4 text-[15px] bg-foreground text-white hover:bg-foreground/90 active:scale-[0.98]"
        >
          {saving ? '저장 중...' : '완료'}
        </Button>
      </div>
    </div>
  );
}
