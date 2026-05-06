'use client';

import { List } from '@/components/ui/list';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortablePlaceItem } from './sortable-place-item';
import type { PlaceRow } from '../types';

type SortState = {
  items: PlaceRow[];
  pinnedIds: Set<number>;
  onDragEnd: (event: DragEndEvent) => void;
  onTogglePin: (id: number) => void;
};

type Props = {
  places: PlaceRow[];
  sortMode: boolean;
  sort: SortState;
  onOpenSheet: (id: number) => void;
};

export function PlaceTab({ places, sortMode, sort, onOpenSheet }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (sortMode) {
    return (
      <List>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={sort.onDragEnd}>
          <SortableContext items={sort.items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {sort.items.map((place) => (
              <SortablePlaceItem
                key={place.id}
                place={place}
                isPinned={sort.pinnedIds.has(place.id)}
                onTogglePin={sort.onTogglePin}
              />
            ))}
          </SortableContext>
        </DndContext>
      </List>
    );
  }

  return (
    <List emptyMessage="등록된 장소가 없습니다.">
      {places.map((place) => (
        <button
          key={place.id}
          onClick={() => onOpenSheet(place.id)}
          className="block w-full px-5 py-4 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {place.isPinned && (
                  <BookmarkSolidIcon className="size-3.5 shrink-0 text-neutral-500" />
                )}
                <p className="text-[15px] font-bold text-foreground">{place.name}</p>
              </div>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {place.floorName}
                {place.tags.length > 0 && (
                  <> · {place.tags.map((t) => `#${t.name}`).join(' ')}</>
                )}
              </p>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </button>
      ))}
    </List>
  );
}
