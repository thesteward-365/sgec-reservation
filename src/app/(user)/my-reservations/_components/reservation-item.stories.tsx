import type { Meta, StoryObj } from '@storybook/react';
import { ReservationItem } from './reservation-item';

const meta: Meta<typeof ReservationItem> = {
  title: 'Components/Reservations/ReservationItem',
  component: ReservationItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-[430px] bg-neutral-100 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReservationItem>;

const mockReservation = {
  id: 1,
  userId: 100,
  placeId: 1,
  placeName: '비전홀',
  floorId: 1,
  floorName: '1층',
  userName: '문화사역관리자',
  startTime: '2026-05-10T10:00:00.000Z',
  endTime: '2026-05-10T12:00:00.000Z',
  purpose: '주일1부 전도지 암송훈련',
  status: 'active' as const,
};

export const Default: Story = {
  args: {
    reservation: mockReservation,
    isMine: false,
  },
};

export const MyReservation: Story = {
  args: {
    reservation: mockReservation,
    isMine: true,
  },
};

export const Cancelled: Story = {
  args: {
    reservation: {
      ...mockReservation,
      status: 'cancelled',
    },
    isMine: false,
  },
};

export const MyCancelled: Story = {
  args: {
    reservation: {
      ...mockReservation,
      status: 'cancelled',
    },
    isMine: true,
  },
};

export const Past: Story = {
  args: {
    reservation: mockReservation,
    isPast: true,
  },
};
