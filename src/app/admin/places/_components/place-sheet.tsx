'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import type { FloorRow, SheetConfig, TagRow } from '../types';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  config: SheetConfig;
  data: { floors: FloorRow[]; tags: TagRow[] };
  onSuccess: () => void;
  onFloorDeleteRequest?: (floorId: number) => void;
};

export function PlaceSheet({
  open,
  onOpenChange,
  config,
  data,
  onSuccess,
  onFloorDeleteRequest,
}: Props) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [floorId, setFloorId] = useState<number | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setName(config.initialValues.name);
      setDesc(config.initialValues.desc);
      setFloorId(config.initialValues.floorId);
      setTagIds(config.initialValues.tagIds);
      requestAnimationFrame(() => {
        bodyRef.current?.scrollTo({ top: 0 });
      });
    }
  }, [open, config.editingId, config.mode]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const method = config.editingId ? 'PATCH' : 'POST';
      const isPlace = config.mode === '장소';
      const endpoint = isPlace
        ? config.editingId
          ? `/api/places/${config.editingId}`
          : '/api/places'
        : config.editingId
          ? `/api/floors/${config.editingId}`
          : '/api/floors';
      const body = isPlace
        ? { name: name.trim(), description: desc.trim(), floorId, tagIds }
        : { name: name.trim() };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '저장에 실패했습니다.');
      }

      toast.success(
        `${config.mode}가 ${config.editingId ? '수정' : '추가'}되었습니다.`
      );
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!config.editingId) return;

    if (config.mode === '층' && onFloorDeleteRequest) {
      onOpenChange(false);
      onFloorDeleteRequest(config.editingId);
      return;
    }

    setSaving(true);
    try {
      const endpoint =
        config.mode === '장소'
          ? `/api/places/${config.editingId}`
          : `/api/floors/${config.editingId}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '삭제에 실패했습니다.');
      }
      toast.success('삭제되었습니다.');
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader>
          <DrawerTitle>
            {config.editingId ? `${config.mode} 수정` : `${config.mode} 추가`}
          </DrawerTitle>
        </DrawerHeader>

        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-6"
        >
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="sheet-name">이름 *</Label>
              <Input
                id="sheet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${config.mode} 이름을 입력하세요`}
              />
            </div>

            {config.mode === '장소' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-desc">설명 (선택)</Label>
                  <Input
                    id="sheet-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="장소에 대한 설명을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label>층 선택</Label>
                  <div className="flex flex-wrap gap-2">
                    {data.floors.map((f) => (
                      <Chip
                        key={f.id}
                        variant={floorId === f.id ? 'active' : 'inactive'}
                        onClick={() =>
                          setFloorId(floorId === f.id ? null : f.id)
                        }
                      >
                        {f.name}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>태그 선택</Label>
                  <div className="flex flex-wrap gap-2">
                    {data.tags.map((t) => (
                      <Chip
                        key={t.id}
                        variant={tagIds.includes(t.id) ? 'active' : 'inactive'}
                        onClick={() =>
                          setTagIds((prev) =>
                            prev.includes(t.id)
                              ? prev.filter((id) => id !== t.id)
                              : [...prev, t.id]
                          )
                        }
                      >
                        #{t.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <DrawerFooter className="border-border bg-card border-t">
          <div className="space-y-2">
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? '저장 중...' : '저장하기'}
            </Button>
            {config.editingId && (
              <Button
                variant="text"
                color="error"
                size="medium"
                onClick={handleDelete}
                disabled={saving}
                className="w-full"
              >
                {config.mode} 삭제하기
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
