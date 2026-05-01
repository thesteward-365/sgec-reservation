import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { WeeklyCalendar } from './weekly-calendar'

const meta: Meta<typeof WeeklyCalendar> = {
  title: 'Components/UI/WeeklyCalendar',
  component: WeeklyCalendar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-background p-4 border-b border-border-subtle" style={{ maxWidth: 430 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof WeeklyCalendar>

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = React.useState<Date | undefined>(new Date())
    return (
      <WeeklyCalendar
        selectedDate={selected}
        onDateSelect={setSelected}
      />
    )
  },
}

export const WithReservationList: Story = {
  render: () => {
    const [selected, setSelected] = React.useState<Date>(new Date())
    const reservations = [
      { time: '10:00 – 12:00', place: '3층 세미나실', purpose: '소그룹 성경공부' },
      { time: '14:00 – 16:00', place: '본당 소강당', purpose: '청년부 모임' },
    ]

    return (
      <div className="flex flex-col">
        <WeeklyCalendar
          selectedDate={selected}
          onDateSelect={setSelected}
        />
        <div className="border-t border-border-subtle mt-2 pt-4 flex flex-col gap-3 px-2">
          <div className="text-caption font-semibold text-foreground">
            {selected.getMonth() + 1}월 {selected.getDate()}일 예약
          </div>
          {reservations.map((r, i) => (
            <div key={i} className="flex flex-col gap-0.5 py-2 border-b border-border-subtle last:border-0">
              <div className="text-body-sm font-semibold text-foreground">{r.place}</div>
              <div className="text-caption text-muted-foreground">{r.time} · {r.purpose}</div>
            </div>
          ))}
        </div>
      </div>
    )
  },
}
