export const SLOT_MINUTES = 30
export const SLOT_COUNT_PER_DAY = (24 * 60) / SLOT_MINUTES

export type ReservationSchedule = {
  id: number
  userId: number
  userName: string | null
  startTime: string | Date
  endTime: string | Date
  purpose: string
}

export type ReservationRange = {
  id: number
  userId: number
  userName: string | null
  purpose: string
  startMinute: number
  endMinute: number
}

export type MinuteRange = {
  startMinute: number
  endMinute: number
}

export const PURPOSE_PRESETS = [
  '예배 준비',
  '소그룹 모임',
  '기도 모임',
  '찬양 연습',
  '상담',
  '교육',
] as const

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getDateTimeForMinute(dateText: string, minute: number): Date {
  const [year, month, day] = dateText.split('-').map(Number)
  const hours = Math.floor(minute / 60)
  const minutes = minute % 60
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

export function formatMinuteLabel(minute: number): string {
  const hours = Math.floor(minute / 60)
  const minutes = minute % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function formatMinuteRange(startMinute: number, endMinute: number): string {
  return `${formatMinuteLabel(startMinute)} - ${formatMinuteLabel(endMinute)}`
}

export function isHalfHourRange(start: Date, end: Date): boolean {
  const durationMinutes = (end.getTime() - start.getTime()) / 60000

  return (
    start.getMinutes() % SLOT_MINUTES === 0 &&
    end.getMinutes() % SLOT_MINUTES === 0 &&
    durationMinutes >= SLOT_MINUTES &&
    durationMinutes % SLOT_MINUTES === 0
  )
}

export function normalizeReservations(reservations: ReservationSchedule[]): ReservationRange[] {
  return reservations
    .map((reservation) => {
      const startTime = new Date(reservation.startTime)
      const endTime = new Date(reservation.endTime)

      return {
        id: reservation.id,
        userId: reservation.userId,
        userName: reservation.userName,
        purpose: reservation.purpose,
        startMinute: startTime.getHours() * 60 + startTime.getMinutes(),
        endMinute: endTime.getHours() * 60 + endTime.getMinutes(),
      }
    })
    .sort((a, b) => a.startMinute - b.startMinute)
}

function mergeRanges(ranges: MinuteRange[]): MinuteRange[] {
  if (ranges.length === 0) return []

  const sorted = [...ranges].sort((a, b) => a.startMinute - b.startMinute)
  const merged: MinuteRange[] = [sorted[0]]

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]
    const last = merged[merged.length - 1]

    if (current.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, current.endMinute)
      continue
    }

    merged.push({ ...current })
  }

  return merged
}

export function getOccupiedRanges(
  reservations: ReservationRange[],
  ignoredReservationId?: number | null
): MinuteRange[] {
  return mergeRanges(
    reservations
      .filter((reservation) => reservation.id !== ignoredReservationId)
      .map(({ startMinute, endMinute }) => ({ startMinute, endMinute }))
  )
}

export function getFreeRanges(
  reservations: ReservationRange[],
  ignoredReservationId?: number | null
): MinuteRange[] {
  const occupiedRanges = getOccupiedRanges(reservations, ignoredReservationId)
  const freeRanges: MinuteRange[] = []
  let cursor = 0

  for (const range of occupiedRanges) {
    if (range.startMinute > cursor) {
      freeRanges.push({ startMinute: cursor, endMinute: range.startMinute })
    }

    cursor = Math.max(cursor, range.endMinute)
  }

  if (cursor < SLOT_COUNT_PER_DAY * SLOT_MINUTES) {
    freeRanges.push({
      startMinute: cursor,
      endMinute: SLOT_COUNT_PER_DAY * SLOT_MINUTES,
    })
  }

  return freeRanges.filter((range) => range.endMinute - range.startMinute >= SLOT_MINUTES)
}

export function getStartOptions(
  reservations: ReservationRange[],
  ignoredReservationId?: number | null
): number[] {
  const freeRanges = getFreeRanges(reservations, ignoredReservationId)
  return freeRanges.flatMap((range) => {
    const options: number[] = []

    for (
      let minute = range.startMinute;
      minute <= range.endMinute - SLOT_MINUTES;
      minute += SLOT_MINUTES
    ) {
      options.push(minute)
    }

    return options
  })
}

export function getEndOptions(
  startMinute: number,
  reservations: ReservationRange[],
  ignoredReservationId?: number | null
): number[] {
  const occupiedRanges = getOccupiedRanges(reservations, ignoredReservationId)
  const nextBlockedMinute =
    occupiedRanges.find((range) => range.startMinute >= startMinute + SLOT_MINUTES)?.startMinute ??
    SLOT_COUNT_PER_DAY * SLOT_MINUTES

  const options: number[] = []

  for (
    let minute = startMinute + SLOT_MINUTES;
    minute <= nextBlockedMinute;
    minute += SLOT_MINUTES
  ) {
    options.push(minute)
  }

  return options
}

export function overlapsExistingRange(
  startMinute: number,
  endMinute: number,
  reservations: ReservationRange[],
  ignoredReservationId?: number | null
): boolean {
  return getOccupiedRanges(reservations, ignoredReservationId).some(
    (range) => startMinute < range.endMinute && endMinute > range.startMinute
  )
}
