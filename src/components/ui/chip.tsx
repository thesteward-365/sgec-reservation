import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils'; // 프로젝트의 utils 경로에 맞춰 수정하세요

const chipVariants = cva(
  'inline-flex items-center justify-center rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        active: 'bg-(--color-fg-strong) text-white',
        inactive:
          'bg-(--color-neutral-300) text-foreground hover:bg-(--color-neutral-400/80)',
      },
      size: {
        sm: 'px-3 py-1 text-[12px]',
        md: 'px-4 py-1.5 text-[13px]',
        lg: 'px-5 py-2 text-[14px]',
      },
    },
    defaultVariants: {
      variant: 'inactive',
      size: 'md',
    },
  }
);

export interface ChipProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(chipVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Chip.displayName = 'Chip';

export { Chip, chipVariants };
