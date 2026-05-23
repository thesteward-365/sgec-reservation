'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { CalendarIcon } from '@heroicons/react/24/outline';

export type ExternalEventSheetItem = {
  id: number | string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string | null;
  isAllDay?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  events: ExternalEventSheetItem[];
};

function formatEventLabel(event: ExternalEventSheetItem) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  const isAllDay =
    event.isAllDay ||
    (start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      end.getHours() === 0 &&
      end.getMinutes() === 0 &&
      end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000);

  if (isAllDay) {
    const endDisplay = new Date(end);
    if (
      endDisplay.getHours() === 0 &&
      endDisplay.getMinutes() === 0 &&
      endDisplay.getSeconds() === 0
    ) {
      endDisplay.setDate(endDisplay.getDate() - 1);
    }

    if (start.toDateString() === endDisplay.toDateString()) {
      return `${start.getMonth() + 1}월 ${start.getDate()}일`;
    }

    return `${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${endDisplay.getMonth() + 1}월 ${endDisplay.getDate()}일`;
  }

  const startLabel = `${String(start.getHours()).padStart(2, '0')}:${String(
    start.getMinutes()
  ).padStart(2, '0')}`;
  const endLabel = `${String(end.getHours()).padStart(2, '0')}:${String(
    end.getMinutes()
  ).padStart(2, '0')}`;

  if (start.toDateString() === end.toDateString()) {
    return `${startLabel} - ${endLabel}`;
  }

  return `${start.getMonth() + 1}월 ${start.getDate()}일 ${startLabel} - ${end.getMonth() + 1}월 ${end.getDate()}일 ${endLabel}`;
}

export function ExternalEventsSheet({
  open,
  onOpenChange,
  dateLabel,
  events,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-(--color-neutral-150)">
        <DrawerHeader>
          <DrawerTitle>{dateLabel} 행사 일정</DrawerTitle>
        </DrawerHeader>

        <div className="mt-2 max-h-[70dvh] overflow-y-auto px-6 pb-6">
          {events.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              표시할 외부 행사가 없습니다.
            </div>
          ) : (
            <div className="divide-border/50 bg-card flex flex-col divide-y overflow-hidden rounded-2xl shadow-(--shadow-1)">
              {events.map((event) => (
                <div key={event.id} className="px-4 py-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-blue-700/80">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    <span className="text-[12px] font-bold uppercase">
                      Event
                    </span>
                  </div>
                  <p className="text-foreground text-[16px] font-bold">
                    {event.title}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[13px] font-medium">
                    {formatEventLabel(event)}
                  </p>
                  {event.description && (
                    <p className="text-muted-foreground mt-2 text-[14px] leading-6">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
