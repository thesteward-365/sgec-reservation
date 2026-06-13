import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'text-color': [
        {
          text: [
            'foreground',
            'primary-foreground',
            'secondary-foreground',
            'muted-foreground',
            'accent-foreground',
            'destructive-foreground',
            'card-foreground',
            'popover-foreground',
            'primary',
            'secondary',
            'muted',
            'accent',
            'destructive',
          ],
        },
      ],
      'font-size': [
        {
          text: [
            'display-md',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'body-lg',
            'body',
            'body-sm',
            'caption',
            'overline',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function formatPhoneNumber(value: string) {
  const digits = normalizePhoneNumber(value);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) {
    return '방금전';
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  }

  if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}시간 전`;
  }

  return `${Math.floor(diffInMinutes / 1440)}일 전`;
}

/**
 * 서버/클라이언트 타임존에 영향받지 않고 항상 KST(한국 표준시, UTC+9) 기준의 오늘 날짜(00:00:00)를 반환합니다.
 */
export function getKSTToday(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  kst.setHours(0, 0, 0, 0);
  return kst;
}

