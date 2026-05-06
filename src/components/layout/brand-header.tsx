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
          src="/logos/logo-with-text.png"
          alt="샘깊은교회 로고"
          width={625}
          height={200}
          className="h-12 w-auto shrink-0"
          priority
          loading="eager"
        />
      </div>
      {action ?? <div className="size-10" aria-hidden="true" />}
    </div>
  );
}
