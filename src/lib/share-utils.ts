import { toast } from 'sonner';
import { formatKoreanDate, formatTime } from './date-utils';

export interface ShareReservationData {
  placeName: string;
  startTime: Date | string | number;
  endTime: Date | string | number;
  userName: string;
  purpose: string;
}

export async function shareText(text: string, title?: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title,
        text,
      });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('정보가 클립보드에 복사되었습니다.');
    }
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      try {
        await navigator.clipboard.writeText(text);
        toast.success('정보가 클립보드에 복사되었습니다.');
      } catch {
        toast.error('정보 공유에 실패했습니다.');
      }
    }
  }
}

export function formatReservationText(data: ShareReservationData) {
  const { placeName, startTime, endTime, userName, purpose } = data;
  return `[예약 정보]
장소: ${placeName}
날짜: ${formatKoreanDate(startTime)}
시간: ${formatTime(startTime)} – ${formatTime(endTime)}
예약자: ${userName}
목적: ${purpose}`;
}

export async function shareReservation(data: ShareReservationData) {
  const text = formatReservationText(data);
  await shareText(text, '예약 정보 공유');
}
