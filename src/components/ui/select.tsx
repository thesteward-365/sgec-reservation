'use client';

import * as React from 'react';
import { Select as RadixSelect } from 'radix-ui';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const SelectSizeContext = React.createContext<'small' | 'medium' | 'large' | undefined>(undefined);

interface SelectProps extends React.ComponentProps<typeof RadixSelect.Root> {
  size?: 'small' | 'medium' | 'large';
}

function Select({ size, children, ...props }: SelectProps) {
  return (
    <SelectSizeContext.Provider value={size}>
      <RadixSelect.Root {...props}>{children}</RadixSelect.Root>
    </SelectSizeContext.Provider>
  );
}

const SelectGroup = RadixSelect.Group;

const SelectValue = RadixSelect.Value;

const selectTriggerVariants = cva(
  'flex w-full items-center justify-between font-semibold text-foreground bg-background outline-none transition-[border-color,box-shadow] duration-120 ease-(--ease-standard) focus:border-primary focus:shadow-(--shadow-focus) aria-[invalid=true]:border-(--color-danger) disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 border border-border-subtle',
  {
    variants: {
      size: {
        small: 'px-[12px] py-[6px] text-caption rounded-sm md:text-caption',
        medium: 'px-[14px] py-[11px] text-body-lg md:text-body rounded-sm',
        large: 'px-[18px] py-[13px] text-body-lg rounded-md',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  }
);

interface SelectTriggerProps
  extends React.ComponentProps<typeof RadixSelect.Trigger>,
    VariantProps<typeof selectTriggerVariants> {}

function SelectTrigger({
  className,
  size: propSize,
  children,
  ...props
}: SelectTriggerProps) {
  const contextSize = React.useContext(SelectSizeContext);
  const size = propSize || contextSize || 'medium';

  return (
    <RadixSelect.Trigger
      data-slot="select-trigger"
      className={cn(selectTriggerVariants({ size, className }))}
      {...props}
    >
      {children}
      <RadixSelect.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof RadixSelect.ScrollUpButton>) {
  return (
    <RadixSelect.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </RadixSelect.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof RadixSelect.ScrollDownButton>) {
  return (
    <RadixSelect.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </RadixSelect.ScrollDownButton>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        data-slot="select-content"
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-sm border border-border-subtle bg-popover text-popover-foreground shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <RadixSelect.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </RadixSelect.Viewport>
        <SelectScrollDownButton />
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof RadixSelect.Label>) {
  return (
    <RadixSelect.Label
      data-slot="select-label"
      className={cn('px-2 py-1.5 text-sm font-semibold', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadixSelect.Item>) {
  return (
    <RadixSelect.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <Check className="h-4 w-4" />
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof RadixSelect.Separator>) {
  return (
    <RadixSelect.Separator
      data-slot="select-separator"
      className={cn('-mx-1 my-1 h-px bg-muted', className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  selectTriggerVariants,
};
