'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { TagRow } from '../types';

type Props = {
  tags: TagRow[];
  editMode: boolean;
  onDelete: (tag: TagRow) => void;
  onAdd: (name: string) => void;
};

export function TagTab({ tags, editMode, onDelete, onAdd }: Props) {
  const [showInput, setShowInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const name = newTagName.trim();
    if (!name) return;
    onAdd(name);
    setNewTagName('');
    setShowInput(false);
  };

  return (
    <Card className="p-5">
      {tags.length === 0 && !showInput ? (
        <p className="text-muted-foreground py-2 text-center text-[14px]">
          등록된 태그가 없습니다.
        </p>
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

          {showInput ? (
            <div className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1">
              <input
                ref={inputRef}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') {
                    setShowInput(false);
                    setNewTagName('');
                  }
                }}
                placeholder="태그 이름"
                className="w-20 text-[13px] outline-none"
                autoFocus
              />
              <button
                onClick={handleAdd}
                className="flex size-4 items-center justify-center rounded-full bg-neutral-900 text-white"
              >
                <CheckIcon className="size-3" />
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowInput(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="border-grey-900 rounded-full border border-dashed hover:rounded-full hover:bg-neutral-50"
            >
              <PlusIcon className="size-3.5" />
              태그 추가
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
