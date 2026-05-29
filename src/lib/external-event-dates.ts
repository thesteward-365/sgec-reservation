export type ExternalEventDateLike = {
  startTime: string | Date;
  endTime: string | Date;
  isAllDay?: boolean | null;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function getKstParts(value: string | Date) {
  const date = toDate(value);
  const kst = new Date(date.getTime() + KST_OFFSET_MS);

  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    hours: kst.getUTCHours(),
    minutes: kst.getUTCMinutes(),
    seconds: kst.getUTCSeconds(),
    milliseconds: kst.getUTCMilliseconds(),
  };
}

function isKstMidnight(value: string | Date): boolean {
  const parts = getKstParts(value);
  return (
    parts.hours === 0 &&
    parts.minutes === 0 &&
    parts.seconds === 0 &&
    parts.milliseconds === 0
  );
}

export function formatExternalEventYMD(value: string | Date): string {
  const { year, month, day } = getKstParts(value);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getExternalEventDateRange(event: ExternalEventDateLike): {
  startDate: string;
  endDate: string;
} {
  const start = toDate(event.startTime);
  const end = toDate(event.endTime);
  const effectiveEnd =
    end.getTime() > start.getTime() && isKstMidnight(end)
      ? new Date(end.getTime() - DAY_MS)
      : end;

  return {
    startDate: formatExternalEventYMD(start),
    endDate: formatExternalEventYMD(effectiveEnd),
  };
}

export function isExternalEventAllDay(event: ExternalEventDateLike): boolean {
  if (event.isAllDay) return true;

  const start = toDate(event.startTime);
  const end = toDate(event.endTime);
  return (
    isKstMidnight(start) &&
    isKstMidnight(end) &&
    end.getTime() - start.getTime() >= DAY_MS
  );
}

function formatKoreanMonthDay(value: string | Date): string {
  const { month, day } = getKstParts(value);
  return `${month}월 ${day}일`;
}

function formatKstTime(value: string | Date): string {
  const { hours, minutes } = getKstParts(value);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatExternalEventDateRangeLabel(
  event: ExternalEventDateLike,
  options: { includeAllDaySuffix?: boolean } = {}
): string {
  const { startDate, endDate } = getExternalEventDateRange(event);
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const start = new Date(
    Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0)
  );
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay, 0, 0, 0));

  const label =
    startDate === endDate
      ? formatKoreanMonthDay(start)
      : `${formatKoreanMonthDay(start)} ~ ${formatKoreanMonthDay(end)}`;

  if (options.includeAllDaySuffix && isExternalEventAllDay(event)) {
    return `${label}`;
  }

  return label;
}

export function formatExternalEventTimeRangeLabel(
  event: ExternalEventDateLike
): string {
  if (isExternalEventAllDay(event)) return '종일';

  const startLabel = formatKstTime(event.startTime);
  const endLabel = formatKstTime(event.endTime);
  const { startDate, endDate } = getExternalEventDateRange(event);

  if (startDate === endDate) {
    return `${startLabel} - ${endLabel}`;
  }

  return `${formatKoreanMonthDay(event.startTime)} ${startLabel} - ${formatKoreanMonthDay(event.endTime)} ${endLabel}`;
}
