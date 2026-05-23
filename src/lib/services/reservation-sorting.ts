type SortOrder = 'asc' | 'desc';

function toTimestamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function toLocalDateKey(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function compareReservationByDayAndTime(
  left: {
    startTime: Date | string | null | undefined;
    endTime: Date | string | null | undefined;
  },
  right: {
    startTime: Date | string | null | undefined;
    endTime: Date | string | null | undefined;
  },
  sortOrder: SortOrder
) {
  const leftDateKey = toLocalDateKey(left.startTime);
  const rightDateKey = toLocalDateKey(right.startTime);

  if (leftDateKey !== rightDateKey) {
    const dateDiff = leftDateKey.localeCompare(rightDateKey);
    return sortOrder === 'asc' ? dateDiff : -dateDiff;
  }

  const startDiff = toTimestamp(left.startTime) - toTimestamp(right.startTime);
  if (startDiff !== 0) {
    return startDiff;
  }

  const endDiff = toTimestamp(left.endTime) - toTimestamp(right.endTime);
  if (endDiff !== 0) {
    return endDiff;
  }

  return 0;
}
