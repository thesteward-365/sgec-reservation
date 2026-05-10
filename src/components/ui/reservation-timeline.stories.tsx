import type { Meta, StoryObj } from '@storybook/react';
import { ReservationTimeline } from './reservation-timeline';

const meta: Meta<typeof ReservationTimeline> = {
  title: 'UI/ReservationTimeline',
  component: ReservationTimeline,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] border p-4 bg-background">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReservationTimeline>;

export const Default: Story = {
  args: {
    reservations: [
      {
        id: 1,
        userId: 1,
        startMinute: 600, // 10:00
        endMinute: 720,   // 12:00
        purpose: '정기 모임',
        userName: '홍길동',
      },
      {
        id: 2,
        userId: 2,
        startMinute: 840, // 14:00
        endMinute: 960,   // 16:00
        purpose: '팀 프로젝트',
        userName: '김철수',
      },
    ],
    selection: { startMin: 720, endMin: 840 },
    onSelectionChange: (s) => console.log('Selection:', s),
    externalEvents: [
      {
        id: 101,
        title: '어버이주일 (종일 행사)',
        startMin: 0,
        endMin: 1440,
      },
      {
        id: 102,
        title: '외부 전도대회 (오후)',
        startMin: 780, // 13:00
        endMin: 1020,  // 17:00
      },
    ],
  },
};

export const WithCollision: Story = {
  args: {
    ...Default.args,
    selection: { startMin: 660, endMin: 780 }, // Collides with id: 1
    collision: true,
  },
};

export const OverlappingExternalEvents: Story = {
  args: {
    ...Default.args,
    externalEvents: [
      {
        id: 301,
        title: '신년 특별 새벽 기도회',
        startMin: 300, // 05:00
        endMin: 420,   // 07:00
      },
      {
        id: 302,
        title: '새벽 기도 차량 봉사',
        startMin: 300, // 05:00
        endMin: 420,   // 07:00
      },
      {
        id: 303,
        title: '새벽 기도 안내팀 모임',
        startMin: 300, // 05:00
        endMin: 420,   // 07:00
      },
    ],
  },
};
