'use client';

import Link from 'next/link';
import { ShareIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { shareText } from '@/lib/share-utils';

type Props = {
  placeId: string;
  shareText: string;
  backUrl: string;
  returnUrl: string;
};

export function CompleteActions({
  placeId,
  shareText: text,
  backUrl,
  returnUrl,
}: Props) {
  async function handleShare() {
    await shareText(text, '예약 완료');
  }

  return (
    <div
      className="mx-auto flex max-w-107.5 flex-col gap-2 px-5 pt-4"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
    >
      <Button variant="default" className="w-full" onClick={handleShare}>
        <ShareIcon className="size-4" />
        공유하기
      </Button>
      <Button variant="secondary" className="w-full" asChild>
        <Link href={backUrl}>동일 장소 재예약하기</Link>
      </Button>
      <Link
        href={returnUrl}
        className="text-body-sm text-muted-foreground flex justify-center py-2 font-semibold"
      >
        돌아가기
      </Link>
    </div>
  );
}
