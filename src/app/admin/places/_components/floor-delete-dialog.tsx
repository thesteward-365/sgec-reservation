'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { FloorRow } from '../types';

type Props = {
  floor: FloorRow | null;
  otherFloors: FloorRow[];
  linkedPlaceCount: number;
  onClose: () => void;
  onSuccess: () => void;
};

export function FloorDeleteDialog({
  floor,
  otherFloors,
  linkedPlaceCount,
  onClose,
  onSuccess,
}: Props) {
  const [policy, setPolicy] = useState<'move' | 'cascade' | null>(null);
  const [targetFloorId, setTargetFloorId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const hasLinkedPlaces = linkedPlaceCount > 0;
  const canMove = otherFloors.length > 0;

  const handleConfirm = async () => {
    if (!floor) return;
    if (policy === 'move' && !targetFloorId) {
      toast.error('이동할 층을 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      const body = !hasLinkedPlaces
        ? undefined
        : policy === 'move'
          ? { policy: 'move', targetFloorId }
          : { policy: 'cascade' };
      const res = await fetch(`/api/floors/${floor.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '삭제에 실패했습니다.');
      }
      toast.success('층이 삭제되었습니다.');
      onClose();
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!floor}
      onOpenChange={(v) => {
        if (!v) {
          setPolicy(null);
          setTargetFloorId(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>층 삭제</DialogTitle>
          <DialogDescription>
            {hasLinkedPlaces ? (
              <>
                <strong>{floor?.name}</strong>에 속한 장소가 {linkedPlaceCount}
                개 있습니다. 어떻게 처리할까요?
              </>
            ) : (
              <>
                <strong>{floor?.name}</strong>을 삭제할까요?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {hasLinkedPlaces && (
          <div className="space-y-3 py-2">
            <label
              className={`flex items-start gap-3 rounded-xl p-3 ${
                canMove ? 'cursor-pointer' : 'opacity-50'
              }`}
            >
              <input
                type="radio"
                name="floorDeletePolicy"
                value="move"
                checked={policy === 'move'}
                onChange={() => canMove && setPolicy('move')}
                className="mt-0.5"
                disabled={!canMove}
              />
              <div>
                <p className="text-[14px] font-semibold">다른 층으로 이동</p>
                <p className="text-muted-foreground text-[12px]">
                  {canMove
                    ? '소속 장소를 선택한 층으로 옮깁니다'
                    : '등록된 다른 층이 없어 이동할 수 없습니다'}
                </p>
              </div>
            </label>

            {policy === 'move' && canMove && (
              <div className="flex flex-wrap gap-2 pl-6">
                {otherFloors.map((f) => (
                  <Chip
                    key={f.id}
                    variant={targetFloorId === f.id ? 'active' : 'inactive'}
                    onClick={() => setTargetFloorId(f.id)}
                  >
                    {f.name}
                  </Chip>
                ))}
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3">
              <input
                type="radio"
                name="floorDeletePolicy"
                value="cascade"
                checked={policy === 'cascade'}
                onChange={() => setPolicy('cascade')}
                className="mt-0.5"
              />
              <div>
                <p className="text-[14px] font-semibold text-red-600">
                  소속 장소도 함께 삭제
                </p>
                <p className="text-muted-foreground text-[12px]">
                  이 작업은 되돌릴 수 없습니다
                </p>
              </div>
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            variant={hasLinkedPlaces ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={
              saving ||
              (hasLinkedPlaces &&
                (!policy || (policy === 'move' && !targetFloorId)))
            }
          >
            {saving ? '삭제 중...' : hasLinkedPlaces ? '삭제' : '삭제하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
