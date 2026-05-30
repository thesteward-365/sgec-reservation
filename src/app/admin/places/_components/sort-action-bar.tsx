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
      className="sticky bottom-0 z-20 mt-auto bg-(--color-neutral-150)"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-107.5 gap-3 px-5 py-4">
        <Button
          variant="outlined"
          color="secondary"
          size="large"
          onClick={onCancel}
          className="flex-1"
        >
          취소
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={onSave}
          disabled={saving || !hasChanges}
          className="flex-1"
        >
          {saving ? '저장 중...' : '완료'}
        </Button>
      </div>
    </div>
  );
}
