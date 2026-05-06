import type { Meta, StoryObj } from '@storybook/react';
import { List, ListItem } from './list';
import { ListSkeleton } from './list-skeleton';

const meta: Meta<typeof List> = {
  title: 'Components/UI/List',
  component: List,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-background p-6" style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof List>;

export const Default: Story = {
  render: () => (
    <List>
      <ListItem>
        <div>
          <p className="text-body font-medium">첫 번째 항목</p>
          <p className="text-caption text-muted-foreground mt-1">설명 텍스트</p>
        </div>
      </ListItem>
      <ListItem>
        <div>
          <p className="text-body font-medium">두 번째 항목</p>
          <p className="text-caption text-muted-foreground mt-1">설명 텍스트</p>
        </div>
      </ListItem>
      <ListItem>
        <div>
          <p className="text-body font-medium">세 번째 항목</p>
          <p className="text-caption text-muted-foreground mt-1">설명 텍스트</p>
        </div>
      </ListItem>
    </List>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <List>
      <ListItem>
        <div className="flex items-start gap-3">
          <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-green-500" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">생성됨</p>
            <p className="text-caption text-muted-foreground mt-1">5분 전</p>
          </div>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex items-start gap-3">
          <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">업데이트됨</p>
            <p className="text-caption text-muted-foreground mt-1">10분 전</p>
          </div>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex items-start gap-3">
          <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">취소됨</p>
            <p className="text-caption text-muted-foreground mt-1">20분 전</p>
          </div>
        </div>
      </ListItem>
    </List>
  ),
};

export const Empty: Story = {
  render: () => <List emptyMessage="데이터가 없습니다" />,
};

export const CustomEmptyMessage: Story = {
  render: () => <List emptyMessage="최근 활동이 없습니다" />,
};

export const WithBadges: Story = {
  render: () => (
    <List>
      <ListItem>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">예약 확정</p>
            <p className="text-caption text-muted-foreground mt-1">홍길동</p>
          </div>
          <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            완료
          </span>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">예약 취소</p>
            <p className="text-caption text-muted-foreground mt-1">김영희</p>
          </div>
          <span className="inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
            취소
          </span>
        </div>
      </ListItem>
    </List>
  ),
};

export const Skeleton: Story = {
  render: () => <ListSkeleton count={3} />,
};

export const SkeletonMany: Story = {
  render: () => <ListSkeleton count={5} />,
};
