'use client';

import { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Floor = { id: number; name: string };
type Tag = { id: number; name: string };

export type FilterState = {
  floorId: number | null;
  tagId: number | null;
  sortOrder: 'asc' | 'desc';
};

type Props = {
  open: boolean;
  onClose: () => void;
  current: FilterState;
  onApply: (state: FilterState) => void;
};

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-pill px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
        active
          ? 'bg-(--color-fg-strong) text-white'
          : 'text-foreground bg-(--color-neutral-200)'
      )}
    >
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground px-0.5 text-[11px] font-medium tracking-widest uppercase">
      {children}
    </p>
  );
}

export function FilterSheet({ open, onClose, current, onApply }: Props) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [draft, setDraft] = useState<FilterState>(current);

  // 마운트 시 floors·tags 로드 (1회)
  useEffect(() => {
    Promise.all([
      fetch('/api/floors').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ]).then(([f, t]) => {
      setFloors(f ?? []);
      setTags(t ?? []);
    });
  }, []);

  // 시트 열릴 때마다 draft를 현재 값으로 초기화
  useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  function reset() {
    setDraft({ floorId: null, tagId: null, sortOrder: 'asc' });
  }

  function apply() {
    onApply(draft);
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>필터</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-2">
          {/* 층 */}
          <div className="flex flex-col gap-2.5">
            <SectionLabel>층</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="전체"
                active={draft.floorId === null}
                onClick={() => setDraft((d) => ({ ...d, floorId: null }))}
              />
              {floors.map((f) => (
                <Chip
                  key={f.id}
                  label={f.name}
                  active={draft.floorId === f.id}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      floorId: d.floorId === f.id ? null : f.id,
                    }))
                  }
                />
              ))}
            </div>
          </div>

          {/* 태그 */}
          {tags.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <SectionLabel>태그</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="전체"
                  active={draft.tagId === null}
                  onClick={() => setDraft((d) => ({ ...d, tagId: null }))}
                />
                {tags.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.name}
                    active={draft.tagId === t.id}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        tagId: d.tagId === t.id ? null : t.id,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* 정렬 */}
          <div className="flex flex-col gap-2.5">
            <SectionLabel>정렬</SectionLabel>
            <div className="flex gap-2">
              <Chip
                label="오래된순"
                active={draft.sortOrder === 'asc'}
                onClick={() => setDraft((d) => ({ ...d, sortOrder: 'asc' }))}
              />
              <Chip
                label="최신순"
                active={draft.sortOrder === 'desc'}
                onClick={() => setDraft((d) => ({ ...d, sortOrder: 'desc' }))}
              />
            </div>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={reset}>
              초기화
            </Button>
            <Button variant="default" className="flex-1" onClick={apply}>
              적용
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
