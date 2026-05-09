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
import { Chip } from '@/components/ui/chip';

type Floor = { id: number; name: string };
type Tag = { id: number; name: string };

export type FilterState = {
  floorId: number | null;
  tagId: number | null;
  sortOrder: 'asc' | 'desc';
  includeCancelled: boolean;
  onlyMine: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  current: FilterState;
  onApply: (state: FilterState) => void;
};

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

  useEffect(() => {
    Promise.all([
      fetch('/api/floors').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ]).then(([f, t]) => {
      setFloors(f ?? []);
      setTags(t ?? []);
    });
  }, []);

  useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  function reset() {
    setDraft({
      floorId: null,
      tagId: null,
      sortOrder: 'asc',
      includeCancelled: false,
      onlyMine: false,
    });
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
                variant={draft.floorId === null ? 'active' : 'inactive'}
                onClick={() => setDraft((d) => ({ ...d, floorId: null }))}
              >
                전체
              </Chip>
              {floors.map((f) => (
                <Chip
                  key={f.id}
                  variant={draft.floorId === f.id ? 'active' : 'inactive'}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      floorId: d.floorId === f.id ? null : f.id,
                    }))
                  }
                >
                  {f.name}
                </Chip>
              ))}
            </div>
          </div>

          {/* 태그 */}
          {tags.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <SectionLabel>태그</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Chip
                  variant={draft.tagId === null ? 'active' : 'inactive'}
                  onClick={() => setDraft((d) => ({ ...d, tagId: null }))}
                >
                  전체
                </Chip>
                {tags.map((t) => (
                  <Chip
                    key={t.id}
                    variant={draft.tagId === t.id ? 'active' : 'inactive'}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        tagId: d.tagId === t.id ? null : t.id,
                      }))
                    }
                  >
                    {t.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {/* 정렬 순서 */}
          <div className="flex flex-col gap-2.5">
            <SectionLabel>정렬</SectionLabel>
            <div className="flex gap-2">
              <Chip
                variant={draft.sortOrder === 'asc' ? 'active' : 'inactive'}
                onClick={() => setDraft((d) => ({ ...d, sortOrder: 'asc' }))}
              >
                오래된순
              </Chip>
              <Chip
                variant={draft.sortOrder === 'desc' ? 'active' : 'inactive'}
                onClick={() => setDraft((d) => ({ ...d, sortOrder: 'desc' }))}
              >
                최신순
              </Chip>
            </div>
          </div>
          {/* 기타 */}
          <div className="flex flex-col gap-2.5">
            <SectionLabel>기타</SectionLabel>
            <div className="flex gap-2">
              <Chip
                variant={draft.onlyMine ? 'active' : 'inactive'}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    onlyMine: !d.onlyMine,
                  }))
                }
              >
                내 예약만 보기
              </Chip>
              <Chip
                variant={
                  draft.includeCancelled === false ? 'active' : 'inactive'
                }
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    includeCancelled: !d.includeCancelled,
                  }))
                }
              >
                취소된 예약 제외
              </Chip>
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
