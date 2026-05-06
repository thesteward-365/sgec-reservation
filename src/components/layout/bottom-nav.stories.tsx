import type { Meta, StoryObj } from '@storybook/react';
import { BottomNav } from './bottom-nav';

const meta: Meta<typeof BottomNav> = {
  title: 'Components/Layout/BottomNav',
  component: BottomNav,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        className="bg-background"
        style={{
          height: '100dvh',
          maxWidth: 430,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <div className="text-body text-muted-foreground p-6">
          페이지 콘텐츠 영역
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

export const 예약하기Active: Story = {
  name: '예약하기 (active)',
  parameters: {
    nextjs: { navigation: { pathname: '/reserve' } },
  },
};

export const 나의예약Active: Story = {
  name: '나의 예약 (active)',
  parameters: {
    nextjs: { navigation: { pathname: '/my-reservations' } },
  },
};

export const 설정Active: Story = {
  name: '설정 (active)',
  parameters: {
    nextjs: { navigation: { pathname: '/settings' } },
  },
};
