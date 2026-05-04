import Image from 'next/image';
import { cn } from '@/lib/utils';

type BrandHeaderProps = {
  action?: React.ReactNode;
  className?: string;
};

export function BrandHeader({ action, className }: BrandHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 pt-4 pb-4',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <Image
          src="/logos/logo-default.svg"
          alt="샘깊은교회 로고"
          width={56}
          height={56}
          className="h-14 w-auto shrink-0"
        />
        <div>
          <p className="text-muted-foreground mb-0.5 text-[12px]! leading-none font-medium!">
            샘깊은교회
          </p>
          <p className="text-foreground text-[14px]! leading-tight font-bold!">
            문화사역 장소방
          </p>
        </div>
      </div>
      {action ?? <div className="size-10" aria-hidden="true" />}
    </div>
  );
}
