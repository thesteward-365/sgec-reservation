import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton } from './skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'Components/UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-background p-6" style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const CardSkeleton: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-6 rounded-2xl border border-border-subtle" style={{ maxWidth: 360 }}>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-pill" />
        <Skeleton className="h-8 w-12 rounded-pill" />
      </div>
    </div>
  ),
}

export const ListSkeleton: Story = {
  render: () => (
    <div className="flex flex-col gap-4" style={{ maxWidth: 430 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 py-3 border-b border-border-subtle">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ))}
    </div>
  ),
}

export const CalendarSkeleton: Story = {
  render: () => (
    <div className="flex flex-col gap-3" style={{ maxWidth: 430 }}>
      <div className="flex items-center justify-between px-2 py-2">
        <Skeleton className="w-7 h-7 rounded-sm" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-7 h-7 rounded-sm" />
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-2">
            <Skeleton className="h-3 w-4 rounded-xs" />
            <Skeleton className="w-8 h-8 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  ),
}
