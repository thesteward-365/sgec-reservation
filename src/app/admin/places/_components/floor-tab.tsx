'use client';

import { Button } from '@/components/ui/button';
import { List } from '@/components/ui/list';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { FloorRow, PlaceRow } from '../types';
import { Chip } from '@/components/ui/chip';

type Props = {
  floors: FloorRow[];
  placesByFloor: Map<number, PlaceRow[]>;
  expandedFloors: Set<number>;
  onToggleExpand: (id: number) => void;
  onOpenSheet: (id: number) => void;
};

export function FloorTab({
  floors,
  placesByFloor,
  expandedFloors,
  onToggleExpand,
  onOpenSheet,
}: Props) {
  return (
    <List emptyMessage="등록된 층이 없습니다.">
      {floors.map((floor) => {
        const isExpanded = expandedFloors.has(floor.id);
        const floorPlaces = placesByFloor.get(floor.id) ?? [];

        return (
          <div key={floor.id}>
            <div className="flex items-center">
              <button
                onClick={() => onOpenSheet(floor.id)}
                className="min-w-0 flex-1 px-5 py-4 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100"
              >
                <p className="text-foreground text-[15px] font-bold">
                  {floor.name}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[13px]">
                  {floorPlaces.length}개 장소
                </p>
              </button>
              <Button
                variant="text"
                color="secondary"
                size="medium"
                onClick={() => onToggleExpand(floor.id)}
                className="mr-1 min-w-0 shrink-0 px-2"
                aria-label={isExpanded ? '접기' : '펼치기'}
              >
                <ChevronDownIcon
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </Button>
            </div>

            {isExpanded && (
              <div className="bg-neutral-50 px-5 pt-1 pb-3">
                {floorPlaces.length === 0 ? (
                  <p className="py-2 text-[14px]">등록된 장소가 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {floorPlaces.map((p) => (
                      <Chip key={p.id} variant={'inactive'}>
                        {p.name}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </List>
  );
}
