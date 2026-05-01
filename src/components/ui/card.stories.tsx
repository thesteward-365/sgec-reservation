import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
import { Button } from './button'

const meta: Meta<typeof Card> = {
  title: 'Components/UI/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-background p-6" style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'subtle' },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Reservation: Story = {
  render: () => (
    <Card style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>3층 세미나실</CardTitle>
        <CardDescription>2026년 5월 1일 · 14:00 – 16:00</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-body-sm text-muted-foreground">소그룹 성경공부 · 홍길동</div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="secondary">수정</Button>
        <Button size="sm" variant="ghost">취소</Button>
      </CardFooter>
    </Card>
  ),
}

export const Place: Story = {
  render: () => (
    <Card style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>본당 소강당</CardTitle>
        <CardDescription>2층 · 최대 50명</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1.5">
          <span className="text-overline text-muted-foreground">예배</span>
          <span className="text-overline text-muted-foreground">·</span>
          <span className="text-overline text-muted-foreground">모임</span>
          <span className="text-overline text-muted-foreground">·</span>
          <span className="text-overline text-muted-foreground">강의</span>
        </div>
      </CardContent>
    </Card>
  ),
}
