import { fromDbDate } from '@/lib/db/db-utils';

/**
 * 예약 수정/취소가 가능한지 확인합니다.
 * 종료 시간으로부터 48시간(2일) 이내인 경우에만 가능합니다.
 *
 * @param endTime 예약 종료 시간 (Date, Unix Seconds, or ISO String)
 * @returns 수정 가능 여부
 */
export function isModifiable(endTime: Date | number | string): boolean {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const end = fromDbDate(endTime);

  return end >= cutoff;
}
