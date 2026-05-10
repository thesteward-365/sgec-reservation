'use client';

import { useRef, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ReservationRange } from '@/lib/services/reservation-slots';

const START_HOUR = 0;
const END_HOUR = 24;
const SLOT_MIN = 30;
const SLOT_H = 28;
const HOUR_H = SLOT_H * 2;
const LABEL_W = 52;
const SCROLL_H = 240;

// Shift everything down so the 00:00 label (at y - 6) isn't cut off
const OFFSET_Y = 24;

const TIMELINE_H = (END_HOUR - START_HOUR) * HOUR_H;

function minToY(min: number): number {
  return ((min - START_HOUR * 60) / SLOT_MIN) * SLOT_H + OFFSET_Y;
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type Selection = { startMin: number; endMin: number };

type ExternalEventBlock = {
  id: number;
  title: string;
  startMin: number;
  endMin: number;
};

type Props = {
  reservations: ReservationRange[];
  selection: Selection;
  onSelectionChange: (s: Selection) => void;
  editingReservationId?: number | null;
  collision?: boolean;
  externalEvents?: ExternalEventBlock[];
};

export function ReservationTimeline({
  reservations,
  selection,
  onSelectionChange,
  editingReservationId,
  collision = false,
  externalEvents = [],
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleReservations = reservations.filter(
    (r) => r.id !== editingReservationId
  );

  // Split external events into all-day and timed
  const allDayEvents = externalEvents.filter(
    (ev) => ev.startMin === 0 && ev.endMin === 1440
  );
  const timedEvents = externalEvents.filter(
    (ev) => !(ev.startMin === 0 && ev.endMin === 1440)
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, minToY(selection.startMin) - SCROLL_H / 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimelinePointerDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const y = e.clientY - rect.top;
      // Subtract OFFSET_Y to get back to the logical coordinate system
      const logicalY = y - OFFSET_Y;
      const rawMin = (logicalY / SLOT_H) * SLOT_MIN + START_HOUR * 60;
      const snapped = Math.round(rawMin / SLOT_MIN) * SLOT_MIN;
      const dur = selection.endMin - selection.startMin;
      const newStart = Math.max(
        START_HOUR * 60,
        Math.min(END_HOUR * 60 - dur, snapped)
      );
      onSelectionChange({ startMin: newStart, endMin: newStart + dur });
    },
    [selection, onSelectionChange]
  );

  const hourLabels = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, i) => START_HOUR + i
  );
  const selTop = minToY(selection.startMin);
  const selHeight = minToY(selection.endMin) - selTop;

  const accentColor = collision ? 'var(--color-danger)' : 'var(--color-accent)';

  return (
    <div className="flex flex-col gap-2 pt-2">
      {/* All-day Events Section */}
      {allDayEvents.length > 0 && (
        <div style={{ marginLeft: LABEL_W }} className="flex flex-col gap-1">
          {allDayEvents.map((ev) => (
            <div
              key={ev.id}
              className="bg-indigo-50 border-l-4 border-indigo-400 px-2.5 py-1.5"
            >
              <p className="text-indigo-700 truncate text-[11px] font-bold leading-tight">
                {ev.title}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        style={{ maxHeight: SCROLL_H, overflowY: 'auto' }}
        className="relative"
      >
        {/* Grid area: starts after label column */}
        <div
          ref={containerRef}
          className="relative select-none"
          style={{ height: TIMELINE_H + OFFSET_Y * 2, marginLeft: LABEL_W }}
          onClick={handleTimelinePointerDown}
        >
          {/* Invisible overlay extending into the label column so tapping labels also works */}
          <div
            className="absolute inset-y-0 touch-none"
            style={{ left: -LABEL_W, width: LABEL_W }}
          />

          {/* Hour labels + full-width grid lines */}
          {hourLabels.map((hour) => {
            const y = minToY(hour * 60);
            return (
              <div
                key={hour}
                className="pointer-events-none absolute inset-x-0"
                style={{ top: y }}
              >
                <span
                  className="text-muted-foreground absolute text-[11px] leading-none font-medium tabular-nums"
                  style={{
                    left: -LABEL_W,
                    width: LABEL_W - 8,
                    textAlign: 'right',
                    top: -6,
                  }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
                <div
                  className="absolute inset-x-0 h-px"
                  style={{
                    background: 'var(--color-border-subtle)',
                    opacity: 0.6,
                  }}
                />
              </div>
            );
          })}

          {/* Half-hour lines */}
          {Array.from(
            { length: END_HOUR - START_HOUR },
            (_, i) => START_HOUR + i
          ).map((hour) => (
            <div
              key={`${hour}.5`}
              className="pointer-events-none absolute inset-x-0 h-px"
              style={{
                top: minToY(hour * 60 + 30),
                background: 'var(--color-border-subtle)',
                opacity: 0.25,
              }}
            />
          ))}

          {/* Existing reservation blocks */}
          {visibleReservations.map((r) => {
            const top = minToY(r.startMinute);
            const height = minToY(r.endMinute) - top;
            return (
              <div
                key={r.id}
                className="pointer-events-none absolute px-3 py-2"
                style={{ top: top + 1, height: height, left: 0, right: 0 }}
              >
                {/* White background box to prevent overlap bleed-through */}
                <div className="absolute inset-0 bg-white" />
                {/* Original background color (semi-transparent) */}
                <div className="absolute inset-0 bg-neutral-200" />
                
                <div className="relative">
                  <p
                    className="text-muted-foreground truncate text-[12px] leading-tight font-semibold"
                    style={{ fontSize: 12 }}
                  >
                    {r.userName ? `${r.userName} · ${r.purpose}` : r.purpose}
                  </p>
                  <p
                    className="text-muted-foreground/80 mt-0.5 text-[11px] tabular-nums"
                    style={{ fontSize: 12 }}
                  >
                    {fmtMin(r.startMinute)} – {fmtMin(r.endMinute)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* External event blocks (행사 일정) */}
          {useMemo(() => {
            // Group timed events by start and end time
            const groups = new Map<string, ExternalEventBlock[]>();
            timedEvents.forEach((ev) => {
              const key = `${ev.startMin}-${ev.endMin}`;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(ev);
            });

            return Array.from(groups.values()).map((group) => {
              const ev = group[0];
              const top = minToY(ev.startMin);
              const height = Math.max(SLOT_H, minToY(ev.endMin) - top);
              const displayTitle = group.length > 1 
                ? `${ev.title} 외 ${group.length - 1}개`
                : ev.title;

              return (
                <div
                  key={ev.id}
                  className="pointer-events-none absolute border-l-4 border-indigo-400 px-3 py-2"
                  style={{
                    top: top + 1,
                    height,
                    left: 0,
                    right: 0,
                    zIndex: 5,
                  }}
                >
                  {/* White background box */}
                  <div className="absolute inset-0 bg-white" />
                  {/* Original background color */}
                  <div className="absolute inset-0 bg-indigo-50/50" />
                  
                  <div className="relative">
                    <p className="text-indigo-700 truncate text-[11px] leading-tight font-bold">
                      {displayTitle}
                    </p>
                  </div>
                </div>
              );
            });
          }, [timedEvents])}

          {/* Selection block — transparent so underlying reservations are visible */}
          {selHeight > 0 && (
            <div
              className={cn(
                'pointer-events-none absolute overflow-hidden',
                collision
                  ? 'border border-(--color-danger)'
                  : 'border-2 border-(--color-accent)'
              )}
              style={{
                top: selTop,
                height: selHeight,
                left: 0,
                right: 0,
                zIndex: 10,
              }}
            >
              {/* White background box for selection as well */}
              <div className="absolute inset-0 bg-white" />
              {/* Original selection background */}
              <div className={cn(
                "absolute inset-0",
                collision ? "bg-(--color-danger)/20" : "bg-accent/50"
              )} />

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2">
                <p
                  className="text-[13px] leading-none font-bold tabular-nums"
                  style={{ color: accentColor }}
                >
                  {fmtMin(selection.startMin)} – {fmtMin(selection.endMin)}
                </p>
                {selHeight > 52 && (
                  <p
                    className="text-[11px] leading-none font-medium"
                    style={{ color: accentColor }}
                  >
                    {collision
                      ? '겹치는 예약이 있어요'
                      : `${selection.endMin - selection.startMin}분`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
