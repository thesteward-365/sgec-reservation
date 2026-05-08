/**
 * PostgreSQL timestamp 컬럼에 저장할 Date 값을 정규화합니다.
 */
export function toDbDate(date: Date): Date {
  return date instanceof Date ? date : new Date(date);
}

/**
 * DB 또는 직렬화된 응답에서 가져온 날짜 값을 Date 객체로 변환합니다.
 */
export function fromDbDate(value: unknown): Date {
  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    // 숫자 timestamp 입력은 seconds / milliseconds 모두 허용합니다.
    if (value > 10000000000) return new Date(value);
    return new Date(value * 1000);
  }

  if (typeof value === 'string' && !Number.isNaN(Number(value))) {
    const numericValue = Number(value);
    if (numericValue > 10000000000) return new Date(numericValue);
    return new Date(numericValue * 1000);
  }

  return new Date(value as string | number | Date);
}
