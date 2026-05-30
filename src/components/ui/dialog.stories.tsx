import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog';
import { Button } from './button';

const meta: Meta = {
  title: 'Components/UI/Dialog',
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        className="bg-background flex items-center justify-center p-6"
        style={{ minHeight: '100dvh' }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const CancelReservation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outlined" color="secondary" size="medium">
          예약 취소
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>예약을 취소할까요?</DialogTitle>
          <DialogDescription>
            3층 세미나실 · 2026년 5월 1일 14:00 – 16:00
            <br />
            취소 후에는 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="text" color="primary" size="medium">
              돌아가기
            </Button>
          </DialogClose>
          <Button variant="contained" color="error" size="medium">
            예약 취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const ApproveUser: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="contained" color="primary" size="medium">
          승인 처리
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사용자를 승인할까요?</DialogTitle>
          <DialogDescription>
            홍길동 님이 가입을 요청했습니다.
            <br />
            승인 후 예약 기능을 사용할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="text" color="primary" size="medium">
              취소
            </Button>
          </DialogClose>
          <Button variant="contained" color="primary" size="medium">
            승인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
