'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
};

export function TagSheet({ open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    setName('');
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0 });
    });
  }, [open]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('태그 이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '태그 추가에 실패했습니다.');
      }

      toast.success('태그가 추가되었습니다.');
      onOpenChange(false);
      await onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '태그 추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader>
          <DrawerTitle>태그 추가</DrawerTitle>
        </DrawerHeader>

        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-6"
        >
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">이름 *</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="태그 이름을 입력하세요"
            />
          </div>
        </div>

        <DrawerFooter className="border-t border-border bg-card">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 text-body font-bold"
          >
            {saving ? '저장 중...' : '저장하기'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
