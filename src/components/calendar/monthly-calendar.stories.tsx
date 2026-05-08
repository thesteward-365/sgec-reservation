import type { Meta, StoryObj } from '@storybook/react';
import { MonthlyCalendar } from './monthly-calendar';
import { useState } from 'react';

const meta: Meta<typeof MonthlyCalendar> = {
  component: MonthlyCalendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MonthlyCalendar>;

const Template = (args: any) => {
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 4, 9));
  const [viewMonth, setViewMonth] = useState(new Date(2026, 4, 1)); // May 2026

  return (
    <div className="w-[375px] bg-neutral-50 p-4">
      <MonthlyCalendar
        {...args}
        selectedDate={selectedDate}
        viewMonth={viewMonth}
        onSelectDate={setSelectedDate}
        onChangeMonth={setViewMonth}
      />
    </div>
  );
};

export const Default: Story = {
  render: (args) => <Template {...args} />,
  args: {
    indicators: new Set(['2026-05-12', '2026-05-13', '2026-05-20']),
  },
};

export const WithEvents: Story = {
  render: (args) => <Template {...args} />,
  args: {
    indicators: new Set(['2026-05-12', '2026-05-13']),
    events: [
      {
        id: 1,
        title: '기도대행진',
        startDate: '2026-05-10',
        endDate: '2026-05-14',
        variant: 'accent',
      },
      {
        id: 2,
        title: '부활절 연습',
        startDate: '2026-05-04',
        endDate: '2026-05-04',
        variant: 'info',
      },
      {
        id: 3,
        title: '특별 집회',
        startDate: '2026-05-24',
        endDate: '2026-05-30',
        variant: 'secondary',
      },
    ],
  },
};

export const MultipleEventsPerDay: Story = {
  render: (args) => <Template {...args} />,
  args: {
    events: [
      {
        id: 1,
        title: '행사 A',
        startDate: '2026-05-18',
        endDate: '2026-05-22',
        variant: 'accent',
      },
      {
        id: 2,
        title: '행사 B',
        startDate: '2026-05-20',
        endDate: '2026-05-20',
        variant: 'secondary',
      },
    ],
  },
};

export const EventsOff: Story = {
  render: (args) => <Template {...args} />,
  args: {
    showEvents: false,
    events: [
      {
        id: 1,
        title: '보이지 않는 행사',
        startDate: '2026-05-10',
        endDate: '2026-05-14',
        variant: 'accent',
      },
    ],
  },
};
