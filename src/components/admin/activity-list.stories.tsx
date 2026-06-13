import type { Meta, StoryObj } from '@storybook/react';
import { ActivityList, type Activity } from './activity-list';
import { ActivityListSkeleton } from './activity-list-skeleton';

const meta: Meta<typeof ActivityList> = {
  title: 'Components/Admin/ActivityList',
  component: ActivityList,
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
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
    reservationId: 101,
    type: 'created',
    message: '새로운 예약이 생성되었습니다 (강당)',
    actor: '이순신',
    place: '강당',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    reservationPurpose: '금요 기도 모임',
    changes: {
      snapshot: {
        placeId: 1,
        placeName: '강당',
        userName: '이순신',
        startTime: new Date(Date.now() - 5 * 60000).toISOString(),
        endTime: new Date(Date.now() + 55 * 60000).toISOString(),
        purpose: '금요 기도 모임',
      }
    }
  },
  {
    id: 2,
    reservationId: 102,
    type: 'updated',
    message: '예약이 수정되었습니다 (회의실 A)',
    actor: '강감찬',
    place: '회의실 A',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    reservationPurpose: '정기 부서 회의',
    changes: {
      purpose: {
        from: '임시 부서 회의',
        to: '정기 부서 회의',
      },
      startTime: {
        from: new Date(Date.now() - 30 * 60000).toISOString(),
        to: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      endTime: {
        from: new Date(Date.now() + 30 * 60000).toISOString(),
        to: new Date(Date.now() + 30 * 60000).toISOString(),
      }
    }
  },
  {
    id: 3,
    reservationId: 103,
    type: 'cancelled',
    message: '예약이 취소되었습니다 (카페)',
    actor: '을지문덕',
    place: '카페',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    reservationPurpose: '청년부 친목 모임',
    changes: {
      snapshot: {
        placeId: 3,
        placeName: '카페',
        userName: '을지문덕',
        startTime: new Date(Date.now() - 2 * 3600000).toISOString(),
        endTime: new Date(Date.now() - 1 * 3600000).toISOString(),
        purpose: '청년부 친목 모임',
      }
    }
  },
  {
    id: 4,
    reservationId: 104,
    type: 'created',
    message: '사용자가 가입 신청했습니다 (홍길동)',
    actor: '홍길동',
    place: '시스템',
    timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
    reservationPurpose: '성경 공부 모임',
    changes: {
      snapshot: {
        placeId: 4,
        placeName: '시스템',
        userName: '홍길동',
        startTime: new Date(Date.now() - 1 * 86400000).toISOString(),
        endTime: new Date(Date.now() - 23 * 3600000).toISOString(),
        purpose: '성경 공부 모임',
      }
    }
  },
];

export const Default: Story = {
  args: {
    activities: mockActivities,
  },
};

export const SingleActivity: Story = {
  args: {
    activities: [mockActivities[0]],
  },
};

export const Empty: Story = {
  args: {
    activities: [],
  },
};

export const ManyActivities: Story = {
  args: {
    activities: [...mockActivities, ...mockActivities, ...mockActivities],
  },
};

export const WithSkeleton: Story = {
  render: () => <ActivityListSkeleton />,
};
