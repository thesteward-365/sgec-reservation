import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-background p-6" style={{ minHeight: '100dvh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const CardSkeleton: Story = {
  render: () => (
    <div
      className="border-border-subtle flex flex-col gap-3 rounded-2xl border p-6"
      style={{ maxWidth: 360 }}
    >
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="rounded-pill h-8 w-16" />
        <Skeleton className="rounded-pill h-8 w-12" />
      </div>
    </div>
  ),
};

export const ListSkeleton: Story = {
  render: () => (
    <div className="flex flex-col gap-4" style={{ maxWidth: 430 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="border-border-subtle flex flex-col gap-1.5 border-b py-3"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ))}
    </div>
  ),
};

export const CalendarSkeleton: Story = {
  render: () => (
    <div className="flex flex-col gap-3" style={{ maxWidth: 430 }}>
      <div className="flex items-center justify-between px-2 py-2">
        <Skeleton className="h-7 w-7 rounded-sm" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-7 rounded-sm" />
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-2">
            <Skeleton className="h-3 w-4 rounded-xs" />
            <Skeleton className="rounded-pill h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  ),
};
