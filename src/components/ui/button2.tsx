import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

const button2Variants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold tracking-wide transition-all duration-120 ease-(--ease-standard) outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:grayscale-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        contained: '',
        outlined: 'border bg-transparent',
        text: 'bg-transparent',
        subtle: '',
      },
      color: {
        primary: '',
        secondary: '',
        success: '',
        error: '',
        warning: '',
        info: '',
        inherit: 'inherit',
      },
      size: {
        small: 'px-[14px] py-[8px] text-overline rounded-sm',
        medium: 'px-[18px] py-[10px] text-caption rounded-md',
        large: 'px-6 py-3.5 text-body-sm rounded-lg',
      },
    },
    compoundVariants: [
      // Contained
      { variant: 'contained', color: 'primary', className: 'bg-primary text-primary-foreground hover:bg-accent-hover' },
      { variant: 'contained', color: 'secondary', className: 'bg-black text-white hover:bg-neutral-800' },
      { variant: 'contained', color: 'success', className: 'bg-success text-white hover:opacity-90' },
      { variant: 'contained', color: 'error', className: 'bg-danger text-white hover:opacity-90' },
      { variant: 'contained', color: 'warning', className: 'bg-warning text-white hover:opacity-90' },
      { variant: 'contained', color: 'info', className: 'bg-info text-white hover:opacity-90' },

      // Outlined (Softer borders using /40 or /50 opacity)
      { variant: 'outlined', color: 'primary', className: 'border-primary/40 text-primary hover:bg-accent-subtle hover:border-primary' },
      { variant: 'outlined', color: 'secondary', className: 'border-black/20 text-black hover:bg-neutral-100 hover:border-black/40' },
      { variant: 'outlined', color: 'success', className: 'border-success/40 text-success hover:bg-success-subtle hover:border-success' },
      { variant: 'outlined', color: 'error', className: 'border-danger/40 text-danger hover:bg-danger-subtle hover:border-danger' },
      { variant: 'outlined', color: 'warning', className: 'border-warning/40 text-warning hover:bg-warning-subtle hover:border-warning' },
      { variant: 'outlined', color: 'info', className: 'border-info/40 text-info hover:bg-info-subtle hover:border-info' },

      // Text
      { variant: 'text', color: 'primary', className: 'text-primary hover:bg-accent-subtle' },
      { variant: 'text', color: 'secondary', className: 'text-black hover:bg-neutral-100' },
      { variant: 'text', color: 'success', className: 'text-success hover:bg-success-subtle' },
      { variant: 'text', color: 'error', className: 'text-danger hover:bg-danger-subtle' },
      { variant: 'text', color: 'warning', className: 'text-warning hover:bg-warning-subtle' },
      { variant: 'text', color: 'info', className: 'text-info hover:bg-info-subtle' },

      // Subtle (Secondary bg darkened to neutral-200)
      { variant: 'subtle', color: 'primary', className: 'bg-accent-subtle text-primary hover:bg-accent-subtle-hover' },
      { variant: 'subtle', color: 'secondary', className: 'bg-neutral-200 text-black hover:bg-neutral-300' },
      { variant: 'subtle', color: 'success', className: 'bg-success-subtle text-success hover:opacity-80' },
      { variant: 'subtle', color: 'error', className: 'bg-danger-subtle text-danger hover:opacity-80' },
      { variant: 'subtle', color: 'warning', className: 'bg-warning-subtle text-warning hover:opacity-80' },
      { variant: 'subtle', color: 'info', className: 'bg-info-subtle text-info hover:opacity-80' },
    ],
    defaultVariants: {
      variant: 'contained',
      color: 'primary',
      size: 'medium',
    },
  }
);

export interface Button2Props
  extends React.ComponentProps<'button'>,
    VariantProps<typeof button2Variants> {
  asChild?: boolean;
}

const Button2 = React.forwardRef<HTMLButtonElement, Button2Props>(
  ({ className, variant, color, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        className={cn(button2Variants({ variant, color, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button2.displayName = 'Button2';

export { Button2, button2Variants };
