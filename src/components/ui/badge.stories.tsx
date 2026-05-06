import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/UI/Badge',
  component: Badge,
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
type Story = StoryObj<typeof Badge>;

export const Solid: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="solid" color="blue">
          신규
        </Badge>
        <Badge variant="solid" color="green">
          승인
        </Badge>
        <Badge variant="solid" color="red">
          취소
        </Badge>
        <Badge variant="solid" color="orange">
          대기
        </Badge>
        <Badge variant="solid" color="neutral">
          관리자
        </Badge>
      </div>
    </div>
  ),
};

export const Subtle: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="subtle" color="blue">
        예약확정
      </Badge>
      <Badge variant="subtle" color="green">
        승인완료
      </Badge>
      <Badge variant="subtle" color="red">
        예약취소
      </Badge>
      <Badge variant="subtle" color="orange">
        승인대기
      </Badge>
      <Badge variant="subtle" color="violet">
        공지
      </Badge>
    </div>
  ),
};

export const Outline: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="text-caption text-muted-foreground">장소 태그</div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">예배</Badge>
        <Badge variant="outline">모임</Badge>
        <Badge variant="outline">강의</Badge>
        <Badge variant="outline">교육</Badge>
        <Badge variant="outline">소그룹</Badge>
        <Badge variant="outline">기도</Badge>
        <Badge variant="outline">찬양</Badge>
      </div>
    </div>
  ),
};

export const ReservationStatus: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="text-caption text-muted-foreground">예약 상태 뱃지</div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="subtle" color="blue">
          예약확정
        </Badge>
        <Badge variant="subtle" color="orange">
          승인대기
        </Badge>
        <Badge variant="subtle" color="red">
          예약취소
        </Badge>
      </div>
    </div>
  ),
};
