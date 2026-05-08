import type { Meta, StoryObj } from '@storybook/react';
import { CalendarIcon } from '@heroicons/react/24/outline';

// 공통 스타일 및 컴포넌트 모사
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-(--shadow-1) overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${className}`}>
    {children}
  </span>
);

// 행사 정보 카드 (추가될 UI)
const InformationalEventCard = ({ title, startDate, endDate, variant = 'accent' }: any) => {
  const variants: any = {
    // 배경을 아주 연하게(30% opacity of blue-50) 하여 눈이 편안하게 수정
    accent: 'bg-blue-50/30 text-blue-700 border-blue-100/50',
    secondary: 'bg-amber-50/30 text-amber-700 border-amber-100/50',
    info: 'bg-indigo-50/30 text-indigo-700 border-indigo-100/50',
  };

  const isSingleDay = startDate === endDate;
  const dateRangeLabel = isSingleDay ? startDate : `${startDate} ~ ${endDate}`;

  return (
    <div className={`p-4 border-b last:border-0 ${variants[variant]}`}>
      <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
        <CalendarIcon className="size-3.5 shrink-0" />
        <span className="font-bold text-[12px] tracking-tight uppercase">Event</span>
      </div>
      <h4 className="text-[16px] font-bold mb-0.5 leading-tight text-foreground">
        {title}
      </h4>
      <p className="text-[13px] opacity-60 font-medium">{dateRangeLabel}</p>
    </div>
  );
};

// 기존 예약 리스트 아이템 UI
const ReservationListItem = ({ time, place, user, purpose, status }: any) => (
  <button className="w-full px-4 py-4 text-left transition hover:bg-neutral-50 active:bg-neutral-100 border-b border-neutral-100 last:border-0">
    <div className="flex items-center gap-3">
      <div className="flex min-w-18 flex-col items-center justify-center rounded-lg bg-neutral-50 px-3 py-2 text-center">
        <span className="text-foreground font-bold tabular-nums text-[14px]">{time.start}</span>
        <span className="text-muted-foreground mt-1 text-[13px] tabular-nums">{time.end}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <p className="text-foreground truncate text-[16px] font-bold">{place}</p>
          {status === 'cancelled' && (
            <Badge className="bg-red-100 text-red-600">취소됨</Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-[14px] leading-snug truncate">
          {user ? `${user} · ` : ''}{purpose}
        </p>
      </div>
    </div>
  </button>
);

const meta: Meta = {
  title: 'Features/DailyDetailView',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="min-h-screen bg-neutral-50 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-[20px] font-bold">5월 9일 (토)</h3>
        <span className="text-muted-foreground text-[14px]">예약 2건</span>
      </div>

      <Card>
        <InformationalEventCard 
          title="기도대행진 (3일차)" 
          startDate="5월 7일"
          endDate="5월 14일"
          variant="accent"
        />

        <div className="divide-y divide-neutral-100">
          <ReservationListItem 
            time={{ start: '10:00', end: '12:00' }}
            place="3층 소예배실"
            user="김철수"
            purpose="성가대 연습"
          />
          <ReservationListItem 
            time={{ start: '14:00', end: '15:30' }}
            place="2층 세미나실"
            user="이영희"
            purpose="교사 회의"
          />
        </div>
      </Card>
    </div>
  ),
};

export const SingleDayEvent: StoryObj = {
  render: () => (
    <div className="min-h-screen bg-neutral-50 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-[20px] font-bold">5월 24일 (일)</h3>
        <span className="text-muted-foreground text-[14px]">예약 1건</span>
      </div>

      <Card>
        <InformationalEventCard 
          title="성탄절 기념 예배" 
          startDate="12월 25일"
          endDate="12월 25일"
          variant="info"
        />
        <div className="divide-y divide-neutral-100">
          <ReservationListItem 
            time={{ start: '09:00', end: '10:30' }}
            place="대예배당"
            user="박민수"
            purpose="예배 준비"
          />
        </div>
      </Card>
    </div>
  ),
};

export const MultipleEvents: StoryObj = {
  render: () => (
    <div className="min-h-screen bg-neutral-50 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-[20px] font-bold">5월 10일 (일)</h3>
        <span className="text-muted-foreground text-[14px]">예약 1건</span>
      </div>

      <Card>
        <InformationalEventCard 
          title="기도대행진 (4일차)" 
          startDate="5월 7일"
          endDate="5월 14일"
          variant="accent"
        />
        <InformationalEventCard 
          title="새가족 환영회" 
          startDate="5월 10일"
          endDate="5월 10일"
          variant="secondary"
        />
        <div className="divide-y divide-neutral-100">
          <ReservationListItem 
            time={{ start: '11:00', end: '12:30' }}
            place="1층 식당"
            user="관리자"
            purpose="식사 봉사"
          />
        </div>
      </Card>
    </div>
  ),
};
