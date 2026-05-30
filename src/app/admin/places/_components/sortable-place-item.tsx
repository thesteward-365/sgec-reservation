'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bars3Icon, BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlaceRow } from '../types';

type Props = {
  place: PlaceRow;
  isPinned: boolean;
  onTogglePin: (id: number) => void;
};

export function SortablePlaceItem({ place, isPinned, onTogglePin }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 px-5 py-4"
    >
      <Button
        variant="text"
        color="secondary"
        size="medium"
        className="min-w-0 shrink-0 cursor-grab touch-none px-2 active:cursor-grabbing"
        aria-label="드래그 핸들"
        {...attributes}
        {...listeners}
      >
        <Bars3Icon className="size-5" />
      </Button>
      <p className="text-foreground flex-1 text-[15px] font-bold">
        {place.name}
      </p>
      <Button
        variant="text"
        color="secondary"
        size="medium"
        onClick={() => onTogglePin(place.id)}
        className={cn(
          'min-w-0 shrink-0 px-2',
          isPinned ? 'text-foreground' : 'text-neutral-400'
        )}
        aria-label={isPinned ? '고정 해제' : '고정'}
      >
        {isPinned ? (
          <BookmarkSolidIcon className="size-5" />
        ) : (
          <BookmarkIcon className="size-5" />
        )}
      </Button>
    </div>
  );
}
