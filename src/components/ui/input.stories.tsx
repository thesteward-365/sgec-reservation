import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'
import { Label } from './label'

const meta: Meta<typeof Input> = {
  title: 'Components/UI/Input',
  component: Input,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-background p-6" style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-4" style={{ maxWidth: 420 }}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">이름</Label>
        <Input id="name" placeholder="홍길동" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">전화번호</Label>
        <Input id="phone" placeholder="010-0000-0000" />
        <div className="text-overline text-muted-foreground leading-[1.4]">
          승인 요청 시 확인용으로 사용됩니다.
        </div>
      </div>
    </div>
  ),
}

export const Error: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5" style={{ maxWidth: 420 }}>
      <Label htmlFor="phone-err">전화번호</Label>
      <Input
        id="phone-err"
        placeholder="010-0000-0000"
        aria-invalid="true"
        defaultValue="010-123"
      />
      <div className="text-overline leading-[1.4] text-(--color-danger)">
        올바른 전화번호를 입력해 주세요.
      </div>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5" style={{ maxWidth: 420 }}>
      <Label htmlFor="disabled-input">장소</Label>
      <Input id="disabled-input" defaultValue="3층 세미나실" disabled />
    </div>
  ),
}
