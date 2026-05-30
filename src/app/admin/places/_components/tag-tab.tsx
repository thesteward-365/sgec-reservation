'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { TagRow } from '../types';

type Props = {
  tags: TagRow[];
  editMode: boolean;
  onDelete: (tag: TagRow) => void;
  onOpenSheet: () => void;
};

export function TagTab({ tags, editMode, onDelete, onOpenSheet }: Props) {
  return (
    <Card className="p-5">
      {tags.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-muted-foreground text-center text-[14px]">
            등록된 태그가 없습니다.
          </p>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={onOpenSheet}
            className="rounded-full border-dashed"
          >
            <PlusIcon className="size-3.5" />첫 태그 추가
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 rounded-full bg-neutral-200 px-4 py-1.5"
            >
              <span className="text-grey-900 text-[13px] font-medium">
                #{tag.name}
              </span>
              {editMode && (
                <button
                  onClick={() => onDelete(tag)}
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-neutral-400 text-neutral-900 hover:bg-neutral-400"
                  aria-label={`${tag.name} 삭제`}
                >
                  <XMarkIcon className="size-3" />
                </button>
              )}
            </div>
          ))}
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={onOpenSheet}
            className="rounded-full border-dashed"
          >
            <PlusIcon className="size-3.5" />
            태그 추가
          </Button>
        </div>
      )}
    </Card>
  );
}
