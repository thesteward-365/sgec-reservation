import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold tracking-wide transition-all duration-120 ease-(--ease-standard) outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed',
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
      isDisabled: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      // Contained
      {
        variant: 'contained',
        color: 'primary',
        isDisabled: false,
        className: 'bg-primary text-primary-foreground hover:bg-accent-hover',
      },
      {
        variant: 'contained',
        color: 'secondary',
        isDisabled: false,
        className: 'bg-(--color-fg-strong) text-white hover:bg-neutral-800',
      },
      {
        variant: 'contained',
        color: 'success',
        isDisabled: false,
        className: 'bg-success text-white hover:bg-green-700',
      },
      {
        variant: 'contained',
        color: 'error',
        isDisabled: false,
        className: 'bg-danger text-white hover:bg-red-700',
      },
      {
        variant: 'contained',
        color: 'warning',
        isDisabled: false,
        className: 'bg-warning text-white hover:bg-orange-700',
      },
      {
        variant: 'contained',
        color: 'info',
        isDisabled: false,
        className: 'bg-info text-white hover:bg-violet-700',
      },

      // Outlined
      {
        variant: 'outlined',
        color: 'primary',
        isDisabled: false,
        className:
          'border-primary/40 text-primary hover:bg-accent-subtle hover:border-primary',
      },
      {
        variant: 'outlined',
        color: 'secondary',
        isDisabled: false,
        className:
          'border-black/20 text-black hover:bg-neutral-100 hover:border-black/40',
      },
      {
        variant: 'outlined',
        color: 'success',
        isDisabled: false,
        className:
          'border-success/40 text-success hover:bg-success-subtle hover:border-success',
      },
      {
        variant: 'outlined',
        color: 'error',
        isDisabled: false,
        className:
          'border-danger/40 text-danger hover:bg-danger-subtle hover:border-danger',
      },
      {
        variant: 'outlined',
        color: 'warning',
        isDisabled: false,
        className:
          'border-warning/40 text-warning hover:bg-warning-subtle hover:border-warning',
      },
      {
        variant: 'outlined',
        color: 'info',
        isDisabled: false,
        className:
          'border-info/40 text-info hover:bg-info-subtle hover:border-info',
      },

      // Text
      {
        variant: 'text',
        color: 'primary',
        isDisabled: false,
        className: 'text-primary hover:bg-accent-subtle',
      },
      {
        variant: 'text',
        color: 'secondary',
        isDisabled: false,
        className: 'text-black hover:bg-neutral-100',
      },
      {
        variant: 'text',
        color: 'success',
        isDisabled: false,
        className: 'text-success hover:bg-success-subtle',
      },
      {
        variant: 'text',
        color: 'error',
        isDisabled: false,
        className: 'text-danger hover:bg-danger-subtle',
      },
      {
        variant: 'text',
        color: 'warning',
        isDisabled: false,
        className: 'text-warning hover:bg-warning-subtle',
      },
      {
        variant: 'text',
        color: 'info',
        isDisabled: false,
        className: 'text-info hover:bg-info-subtle',
      },

      // Subtle
      {
        variant: 'subtle',
        color: 'primary',
        isDisabled: false,
        className: 'bg-accent-subtle text-primary hover:bg-accent-subtle-hover',
      },
      {
        variant: 'subtle',
        color: 'secondary',
        isDisabled: false,
        className: 'bg-neutral-200 text-black hover:bg-neutral-300',
      },
      {
        variant: 'subtle',
        color: 'success',
        isDisabled: false,
        className: 'bg-success-subtle text-success hover:bg-green-100',
      },
      {
        variant: 'subtle',
        color: 'error',
        isDisabled: false,
        className: 'bg-danger-subtle text-danger hover:bg-red-100',
      },
      {
        variant: 'subtle',
        color: 'warning',
        isDisabled: false,
        className: 'bg-warning-subtle text-warning hover:bg-orange-100',
      },
      {
        variant: 'subtle',
        color: 'info',
        isDisabled: false,
        className: 'bg-info-subtle text-info hover:bg-violet-100',
      },

      // Disabled Styles (High Contrast)
      {
        variant: 'contained',
        isDisabled: true,
        className: 'bg-neutral-400 text-neutral-800',
      },
      {
        variant: 'outlined',
        isDisabled: true,
        className: 'bg-transparent border-neutral-500 text-neutral-600',
      },
      {
        variant: 'text',
        isDisabled: true,
        className: 'bg-transparent text-neutral-500',
      },
      {
        variant: 'subtle',
        isDisabled: true,
        className: 'bg-neutral-300 text-neutral-700',
      },
    ],
    defaultVariants: {
      variant: 'contained',
      color: 'primary',
      size: 'medium',
      isDisabled: false,
    },
  }
);

export interface ButtonProps
  extends
    Omit<React.ComponentProps<'button'>, 'color' | 'disabled'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  disabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, color, size, disabled, asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        className={cn(
          buttonVariants({
            variant,
            color,
            size,
            isDisabled: !!disabled,
            className,
          })
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
