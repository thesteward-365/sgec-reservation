/**
 * DB 환경에 관계없이 Date 타입을 초(seconds) 단위 정수로 변환합니다.
 */
export function toDbDate(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * DB에서 가져온 초(seconds) 단위 정수를 Date 객체로 변환합니다.
 */
export function fromDbDate(value: any): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // 100억보다 크면 밀리초로 간주하여 처리 (안전장치)
    if (value > 10000000000) return new Date(value);
    return new Date(value * 1000);
  }
  return new Date(value);
}
