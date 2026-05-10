export function formatKoreanDate(dt: Date | string | number): string {
  if (!dt) return '-';
  const d = typeof dt === 'number' ? new Date(dt * 1000) : new Date(dt);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  
  // Intl.DateTimeFormat with timeZone is better if available, 
  // but manually constructing for consistency with other utils
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][kst.getUTCDay()];
  
  return `${month}월 ${day}일 (${weekday})`;
}

export function formatTime(dt: Date | string | number): string {
  if (!dt) return '-';
  const d = typeof dt === 'number' ? new Date(dt * 1000) : new Date(dt);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hours = String(kst.getUTCHours()).padStart(2, '0');
  const minutes = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function toYMD(dt: Date | string | number): string {
  if (!dt) return '';
  const d = typeof dt === 'number' ? new Date(dt * 1000) : new Date(dt);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}
