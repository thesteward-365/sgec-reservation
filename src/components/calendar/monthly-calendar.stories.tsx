import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type ComponentProps } from 'react';
import { MonthlyCalendar } from './monthly-calendar';

const meta: Meta<typeof MonthlyCalendar> = {
  component: MonthlyCalendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MonthlyCalendar>;
type MonthlyCalendarProps = ComponentProps<typeof MonthlyCalendar>;

const Template = (args: MonthlyCalendarProps) => {
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

function WeekendTodayCalendar({
  label,
  today,
}: {
  label: string;
  today: Date;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 4, 13));
  const [viewMonth, setViewMonth] = useState(new Date(2026, 4, 1));

  return (
    <div className="w-[375px] bg-neutral-50 p-4">
      <p className="text-muted-foreground mb-2 text-[12px] font-semibold">
        {label}
      </p>
      <MonthlyCalendar
        selectedDate={selectedDate}
        viewMonth={viewMonth}
        onSelectDate={setSelectedDate}
        onChangeMonth={setViewMonth}
        today={today}
        showEvents={false}
      />
    </div>
  );
}

export const Default: Story = {
  render: (args) => <Template {...args} />,
  args: {
    indicators: new Set(['2026-05-12', '2026-05-13', '2026-05-20']),
  },
};

export const MultiWeekEvent: Story = {
  render: (args) => <Template {...args} />,
  args: {
    events: [
      {
        id: 1,
        title: '여러 주에 걸친 행사',
        startDate: '2026-05-15',
        endDate: '2026-05-19',
        variant: 'accent',
      },
    ],
  },
};

export const OverlappingEvents: Story = {
  render: (args) => <Template {...args} />,
  args: {
    events: [
      {
        id: 1,
        title: '긴 행사 A',
        startDate: '2026-05-10',
        endDate: '2026-05-14',
        variant: 'accent',
      },
      {
        id: 2,
        title: '중첩 행사 B',
        startDate: '2026-05-12',
        endDate: '2026-05-12',
        variant: 'secondary',
      },
    ],
  },
};

export const ComplexScenario: Story = {
  render: (args) => <Template {...args} />,
  args: {
    indicators: new Set(['2026-05-12', '2026-05-18']),
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
        title: '특별 집회',
        startDate: '2026-05-13',
        endDate: '2026-05-13',
        variant: 'info',
      },
      {
        id: 3,
        title: '심야 기도회',
        startDate: '2026-05-15',
        endDate: '2026-05-19',
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

export const WeekendTodayHighlight: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <WeekendTodayCalendar
        label="오늘이 토요일인 경우"
        today={new Date(2026, 4, 16)}
      />
      <WeekendTodayCalendar
        label="오늘이 일요일인 경우"
        today={new Date(2026, 4, 17)}
      />
    </div>
  ),
};
