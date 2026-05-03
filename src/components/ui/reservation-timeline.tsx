'use client'

import { useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ReservationRange } from '@/lib/services/reservation-slots'

const START_HOUR = 0
const END_HOUR = 24
const SLOT_MIN = 30
const SLOT_H = 28
const HOUR_H = SLOT_H * 2
const LABEL_W = 52
const SCROLL_H = 380

const TIMELINE_H = (END_HOUR - START_HOUR) * HOUR_H

function minToY(min: number): number {
  return ((min - START_HOUR * 60) / SLOT_MIN) * SLOT_H
}

function clamp(min: number): number {
  return Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, min))
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

type Selection = { startMin: number; endMin: number }

type Props = {
  reservations: ReservationRange[]
  selection: Selection
  onSelectionChange: (s: Selection) => void
  editingReservationId?: number | null
  collision?: boolean
}

export function ReservationTimeline({
  reservations,
  selection,
  onSelectionChange,
  editingReservationId,
  collision = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    type: 'top' | 'bottom'
    startY: number
    baseMin: number
    baseStart: number
    baseEnd: number
  } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const visibleReservations = reservations.filter(r => r.id !== editingReservationId)

  // Scroll to show ~1 slot above the selection on mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = Math.max(0, minToY(selection.startMin) - SCROLL_H / 3)
  // key prop on this component handles reset when date/place changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Remove window listeners if component unmounts mid-drag
  useEffect(() => {
    return () => { cleanupRef.current?.() }
  }, [])

  const handleTimelinePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current) return
      const rect = containerRef.current!.getBoundingClientRect()
      const y = e.clientY - rect.top
      const rawMin = (y / SLOT_H) * SLOT_MIN + START_HOUR * 60
      const snapped = Math.round(rawMin / SLOT_MIN) * SLOT_MIN
      const newStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 60, snapped))
      onSelectionChange({ startMin: newStart, endMin: newStart + 60 })
    },
    [onSelectionChange]
  )

  const handleHandlePointerDown = useCallback(
    (type: 'top' | 'bottom', e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      dragRef.current = {
        type,
        startY: e.clientY,
        baseMin: type === 'top' ? selection.startMin : selection.endMin,
        baseStart: selection.startMin,
        baseEnd: selection.endMin,
      }

      const scrollEl = scrollRef.current

      function onMove(ev: PointerEvent) {
        const drag = dragRef.current
        if (!drag) return

        // Auto-scroll when pointer is near the top or bottom edge of the scroll container
        if (scrollEl) {
          const { top, bottom } = scrollEl.getBoundingClientRect()
          if (ev.clientY < top + 56) scrollEl.scrollTop -= 4
          else if (ev.clientY > bottom - 56) scrollEl.scrollTop += 4
        }

        const dy = ev.clientY - drag.startY
        const dMin = Math.round(dy / SLOT_H) * SLOT_MIN
        if (drag.type === 'top') {
          const newStart = clamp(drag.baseMin + dMin)
          onSelectionChange({
            startMin: Math.min(newStart, drag.baseEnd - SLOT_MIN),
            endMin: drag.baseEnd,
          })
        } else {
          const newEnd = clamp(drag.baseMin + dMin)
          onSelectionChange({
            startMin: drag.baseStart,
            endMin: Math.max(newEnd, drag.baseStart + SLOT_MIN),
          })
        }
      }

      function onUp() {
        dragRef.current = null
        cleanupRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }

      cleanupRef.current = onUp
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [selection, onSelectionChange]
  )

  const hourLabels = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
  const selTop = minToY(selection.startMin)
  const selHeight = minToY(selection.endMin) - selTop

  const accentColor = collision ? 'var(--color-danger)' : 'var(--color-accent)'

  return (
    <div
      ref={scrollRef}
      style={{ maxHeight: SCROLL_H, overflowY: 'auto' }}
      className="relative"
    >
      <div
        className="relative select-none"
        style={{ height: TIMELINE_H, marginLeft: LABEL_W }}
        ref={containerRef}
        onPointerDown={handleTimelinePointerDown}
      >
        {/* Hour labels + grid lines */}
        {hourLabels.map(hour => {
          const y = minToY(hour * 60)
          return (
            <div key={hour} className="pointer-events-none absolute inset-x-0" style={{ top: y }}>
              <span
                className="absolute tabular-nums text-[11px] font-medium leading-none text-muted-foreground"
                style={{ left: -LABEL_W, width: LABEL_W - 8, textAlign: 'right', top: -6 }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
              <div
                className="absolute inset-x-0 h-px"
                style={{ background: 'var(--color-border-subtle)', opacity: 0.6 }}
              />
            </div>
          )
        })}

        {/* Half-hour lines */}
        {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map(hour => (
          <div
            key={`${hour}.5`}
            className="pointer-events-none absolute inset-x-0 h-px"
            style={{ top: minToY(hour * 60 + 30), background: 'var(--color-border-subtle)', opacity: 0.25 }}
          />
        ))}

        {/* Existing reservation blocks */}
        {visibleReservations.map(r => {
          const top = minToY(r.startMinute)
          const height = minToY(r.endMinute) - top
          return (
            <div
              key={r.id}
              className="pointer-events-none absolute rounded-xl bg-neutral-200 px-3 py-2"
              style={{ top: top + 1, height: height - 2, left: 2, right: 2 }}
            >
              <p className="truncate text-[12px] font-semibold leading-tight text-muted-foreground">
                {r.userName ? `${r.userName} · ${r.purpose}` : r.purpose}
              </p>
              <p className="mt-0.5 tabular-nums text-[11px] text-muted-foreground/80">
                {fmtMin(r.startMinute)} – {fmtMin(r.endMinute)}
              </p>
            </div>
          )
        })}

        {/* Selection block */}
        {selHeight > 0 && (
          <div
            className={cn(
              'absolute overflow-visible rounded-xl',
              collision ? 'border border-(--color-danger) bg-red-50' : 'border-2 border-(--color-accent) bg-blue-50'
            )}
            style={{ top: selTop + 1, height: selHeight - 2, left: 2, right: 2, zIndex: 10 }}
            onPointerDown={e => e.stopPropagation()}
          >
            {/* Top handle */}
            <div
              className="absolute inset-x-0 top-0 flex -translate-y-1/2 cursor-ns-resize touch-none items-center justify-center"
              style={{ zIndex: 12 }}
              onPointerDown={e => handleHandlePointerDown('top', e)}
            >
              <div
                className="flex h-5 w-10 items-center justify-center rounded-full bg-card"
                style={{ boxShadow: `0 0 0 1.5px ${accentColor}` }}
              >
                <div className="h-0.75 w-6 rounded-full" style={{ background: accentColor }} />
              </div>
            </div>

            {/* Time label + duration */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2">
              <p
                className="text-[13px] font-bold tabular-nums leading-none"
                style={{ color: accentColor }}
              >
                {fmtMin(selection.startMin)} – {fmtMin(selection.endMin)}
              </p>
              {selHeight > 40 && (
                <p className="text-[11px] font-medium leading-none" style={{ color: accentColor }}>
                  {collision ? '겹치는 예약이 있어요' : `${selection.endMin - selection.startMin}분`}
                </p>
              )}
            </div>

            {/* Bottom handle */}
            <div
              className="absolute inset-x-0 bottom-0 flex translate-y-1/2 cursor-ns-resize touch-none items-center justify-center"
              style={{ zIndex: 12 }}
              onPointerDown={e => handleHandlePointerDown('bottom', e)}
            >
              <div
                className="flex h-5 w-10 items-center justify-center rounded-full bg-card"
                style={{ boxShadow: `0 0 0 1.5px ${accentColor}` }}
              >
                <div className="h-0.75 w-6 rounded-full" style={{ background: accentColor }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
