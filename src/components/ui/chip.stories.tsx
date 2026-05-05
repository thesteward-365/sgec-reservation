import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './chip'; // 파일 경로에 맞춰 수정하세요
import { useState } from 'react';

const meta: Meta<typeof Chip> = {
  title: 'Components/UI/Chip',
  component: Chip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        className="bg-background flex items-center justify-center p-10"
        style={{ minHeight: '40vh' }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Interactive: Story = {
  render: () => {
    const [view, setView] = useState('list');
    const items = [
      { label: '리스트 보기', value: 'list' },
      { label: '캘린더 보기', value: 'calendar' },
    ];

    return (
      <div className="flex gap-2">
        {items.map((item) => (
          <Chip
            key={item.value}
            variant={view === item.value ? 'active' : 'inactive'}
            onClick={() => setView(item.value)}
          >
            {item.label}
          </Chip>
        ))}
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <Chip size="sm" variant="active">
          Small Active
        </Chip>
        <Chip size="sm">Small Inactive</Chip>
      </div>
      <div className="flex items-center gap-2">
        <Chip size="md" variant="active">
          Medium Active
        </Chip>
        <Chip size="md">Medium Inactive</Chip>
      </div>
      <div className="flex items-center gap-2">
        <Chip size="lg" variant="active">
          Large Active
        </Chip>
        <Chip size="lg">Large Inactive</Chip>
      </div>
    </div>
  ),
};

export const Active: Story = {
  args: {
    variant: 'active',
    size: 'md',
    children: 'Active Chip',
  },
};

export const Inactive: Story = {
  args: {
    variant: 'inactive',
    size: 'md',
    children: 'Inactive Chip',
  },
};
