import type { Meta, StoryObj } from '@storybook/react'
import { BottomNav } from './bottom-nav'

const meta: Meta<typeof BottomNav> = {
  title: 'Components/Layout/BottomNav',
  component: BottomNav,
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/reserve',
      },
    },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="bg-background" style={{ height: '100vh', maxWidth: 430, position: 'relative' }}>
        <div className="p-6 text-body text-muted-foreground">페이지 콘텐츠 영역</div>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof BottomNav>

export const ReservePage: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/reserve' } },
  },
}

export const MyReservationsPage: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/my-reservations' } },
  },
}

export const SettingsPage: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/settings' } },
  },
}
