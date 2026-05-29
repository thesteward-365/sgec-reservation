'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { CalendarIcon } from '@heroicons/react/24/outline';
import {
  formatExternalEventDateRangeLabel,
  formatExternalEventTimeRangeLabel,
  isExternalEventAllDay,
} from '@/lib/external-event-dates';

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
  if (isExternalEventAllDay(event)) {
    return formatExternalEventDateRangeLabel(event);
  }

  return formatExternalEventTimeRangeLabel(event);
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
