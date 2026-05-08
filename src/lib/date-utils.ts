export function formatKoreanDate(dt: Date | string | number): string {
  if (!dt) return '-';
  const d = typeof dt === 'number' ? new Date(dt * 1000) : new Date(dt);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(d);
}

export function formatTime(dt: Date | string | number): string {
  if (!dt) return '-';
  const d = typeof dt === 'number' ? new Date(dt * 1000) : new Date(dt);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function toYMD(dt: Date | string | number): string {
  if (!dt) return '';
  const d = typeof dt === 'number' ? new Date(dt * 1000) : new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
