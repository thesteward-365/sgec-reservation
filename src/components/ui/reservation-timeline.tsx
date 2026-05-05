'use client';

import { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ReservationRange } from '@/lib/services/reservation-slots';

const START_HOUR = 0;
const END_HOUR = 24;
const SLOT_MIN = 30;
const SLOT_H = 28;
const HOUR_H = SLOT_H * 2;
const LABEL_W = 52;
const SCROLL_H = 240;

const TIMELINE_H = (END_HOUR - START_HOUR) * HOUR_H;

function minToY(min: number): number {
  return ((min - START_HOUR * 60) / SLOT_MIN) * SLOT_H;
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
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
      const rawMin = (y / SLOT_H) * SLOT_MIN + START_HOUR * 60;
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
    <div
      ref={scrollRef}
      style={{ maxHeight: SCROLL_H, overflowY: 'auto' }}
      className="relative pt-2"
    >
      {/* Grid area: starts after label column */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: TIMELINE_H, marginLeft: LABEL_W }}
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
              className="pointer-events-none absolute bg-neutral-200 px-3 py-2"
              style={{ top: top + 1, height: height, left: 0, right: 0 }}
            >
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
          );
        })}

        {/* External event blocks (행사 일정) */}
        {externalEvents.map((ev) => {
          const top = minToY(ev.startMin);
          const height = Math.max(SLOT_H, minToY(ev.endMin) - top);
          return (
            <div
              key={ev.id}
              className="pointer-events-none absolute px-3 py-2"
              style={{
                top: top + 1,
                height,
                left: 0,
                right: 0,
                background: 'var(--color-accent)/10',
                borderLeft: '3px solid var(--color-accent)',
                opacity: 0.7,
              }}
            >
              <p
                className="truncate text-[11px] font-semibold leading-tight"
                style={{ color: 'var(--color-accent)' }}
              >
                {ev.title}
              </p>
            </div>
          );
        })}

        {/* Selection block — transparent so underlying reservations are visible */}
        {selHeight > 0 && (
          <div
            className={cn(
              'pointer-events-none absolute overflow-hidden',
              collision
                ? 'border border-(--color-danger) bg-(--color-danger)/20'
                : 'bg-accent/50 border-2 border-(--color-accent)'
            )}
            style={{
              top: selTop,
              height: selHeight,
              left: 0,
              right: 0,
              zIndex: 10,
            }}
          >
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
  );
}
