import type { Meta, StoryObj } from '@storybook/react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from './drawer';
import { Button } from './button';
import { Badge } from './badge';

const meta: Meta = {
  title: 'Components/UI/Drawer',
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        className="bg-background flex items-center justify-center p-6"
        style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto' }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const PlaceFilter: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" size="md">
          필터
        </Button>
      </DrawerTrigger>
      <DrawerContent style={{ maxWidth: 430, margin: '0 auto' }}>
        <DrawerHeader>
          <DrawerTitle>장소 필터</DrawerTitle>
          <DrawerDescription>
            층 또는 태그로 장소를 찾아보세요.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-6 pb-2">
          <div className="flex flex-col gap-2">
            <div className="text-caption text-foreground font-semibold">층</div>
            <div className="flex flex-wrap gap-2">
              {['지하 1층', '1층', '2층', '3층', '4층'].map((floor) => (
                <Badge key={floor} variant="outline">
                  {floor}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-caption text-foreground font-semibold">
              태그
            </div>
            <div className="flex flex-wrap gap-2">
              {['예배', '모임', '강의', '교육', '소그룹', '기도', '찬양'].map(
                (tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                )
              )}
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button size="default">적용</Button>
          <DrawerClose asChild>
            <Button variant="ghost" size="default">
              닫기
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const ReservationDetail: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button size="md">예약 상세</Button>
      </DrawerTrigger>
      <DrawerContent style={{ maxWidth: 430, margin: '0 auto' }}>
        <DrawerHeader>
          <DrawerTitle>예약 상세</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-6 pb-2">
          <div className="flex flex-col gap-0.5">
            <div className="text-caption text-muted-foreground">장소</div>
            <div className="text-body text-foreground font-medium">
              3층 세미나실
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-caption text-muted-foreground">일시</div>
            <div className="text-body text-foreground font-medium">
              2026년 5월 1일 · 14:00 – 16:00
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-caption text-muted-foreground">목적</div>
            <div className="text-body text-foreground font-medium">
              소그룹 성경공부
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-caption text-muted-foreground">예약자</div>
            <div className="text-body text-foreground font-medium">홍길동</div>
          </div>
        </div>
        <DrawerFooter>
          <Button variant="secondary" size="default">
            수정
          </Button>
          <Button variant="destructive" size="default">
            예약 취소
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
