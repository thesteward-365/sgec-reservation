import type { Meta, StoryObj } from '@storybook/react';
import { ActivityList, type Activity } from './activity-list';
import { ActivityListSkeleton } from './activity-list-skeleton';

const meta: Meta<typeof ActivityList> = {
  title: 'Components/Admin/ActivityList',
  component: ActivityList,
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
type Story = StoryObj<typeof ActivityList>;

const mockActivities: Activity[] = [
  {
    id: 1,
    type: 'created',
    message: '새로운 예약이 생성되었습니다 (강당)',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 2,
    type: 'updated',
    message: '예약이 수정되었습니다 (회의실 A)',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 3,
    type: 'cancelled',
    message: '예약이 취소되었습니다 (카페)',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 4,
    type: 'created',
    message: '사용자가 가입 신청했습니다 (이순신)',
    timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const Default: Story = {
  render: () => <ActivityList activities={mockActivities} />,
};

export const SingleActivity: Story = {
  render: () => <ActivityList activities={[mockActivities[0]]} />,
};

export const Empty: Story = {
  render: () => <ActivityList activities={[]} />,
};

export const ManyActivities: Story = {
  render: () => (
    <ActivityList
      activities={[...mockActivities, ...mockActivities, ...mockActivities]}
    />
  ),
};

export const WithSkeleton: Story = {
  render: () => <ActivityListSkeleton />,
};
