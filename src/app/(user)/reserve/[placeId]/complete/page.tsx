import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { db } from '@/lib/db';
import { places, floors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

type PageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{
    date?: string;
    start?: string;
    end?: string;
    purpose?: string;
  }>;
};

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatKoreanDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export default async function ReservationCompletePage({ params, searchParams }: PageProps) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) redirect('/login');

  const { placeId } = await params;
  const sp = await searchParams;

  const id = parseInt(placeId);
  if (isNaN(id)) notFound();

  const [place] = await db
    .select({ name: places.name, floorName: floors.name })
    .from(places)
    .leftJoin(floors, eq(places.floorId, floors.id))
    .where(eq(places.id, id));

  if (!place) notFound();

  const startMin = parseInt(sp.start ?? '');
  const endMin = parseInt(sp.end ?? '');
  const date = sp.date ?? '';
  const purpose = sp.purpose ?? '';
  const userName = session.user.name;

  const placeLabel = place.floorName
    ? `${place.name} · ${place.floorName}`
    : place.name;
  const timeLabel =
    !isNaN(startMin) && !isNaN(endMin)
      ? `${fmtMin(startMin)} – ${fmtMin(endMin)}`
      : '–';
  const dateLabel = date ? formatKoreanDate(date) : '–';

  const rows = [
    { label: '장소', value: placeLabel },
    { label: '날짜', value: dateLabel },
    { label: '시간', value: timeLabel },
    { label: '목적', value: purpose || '–' },
    { label: '예약자', value: userName },
  ];

  return (
    <>
      {/* AppBar */}
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center justify-center">
          <p className="text-body font-bold text-foreground">예약 완료</p>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="px-5 pb-48 pt-14">
        {/* 성공 아이콘 */}
        <div className="flex flex-col items-center gap-3 pb-6 pt-8">
          <div
            className="flex size-[72px] items-center justify-center rounded-full"
            style={{ background: 'var(--color-success-subtle)' }}
          >
            <CheckIcon
              className="size-9"
              style={{ color: 'var(--color-success)', strokeWidth: 2.5 }}
            />
          </div>
          <h2 className="text-center text-h2 font-bold text-foreground">
            예약이 완료되었어요
          </h2>
          <p className="text-center text-caption text-muted-foreground">
            Google Calendar에도 자동 등록됩니다
          </p>
        </div>

        {/* 상세 정보 카드 */}
        <div className="flex flex-col gap-[10px] rounded-2xl bg-card px-[18px] py-[18px] shadow-(--shadow-1)">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="shrink-0 text-[13px] font-medium text-muted-foreground">
                {label}
              </span>
              <span
                className="text-right text-[14px] font-semibold text-foreground"
                style={{ letterSpacing: '-0.003em' }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 고정 하단 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-(--color-neutral-150)">
        <div
          className="mx-auto flex max-w-107.5 flex-col gap-2 px-5 pt-4"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          <Button className="w-full" asChild>
            <Link href="/reserve">공유하기</Link>
          </Button>
          <Button variant="secondary" className="w-full" asChild>
            <Link href={`/reserve/${placeId}`}>동일 장소 재예약하기</Link>
          </Button>
          <Link
            href="/my-reservations"
            className="flex justify-center py-2 text-body-sm font-semibold text-muted-foreground"
          >
            나의 예약 보기
          </Link>
        </div>
      </div>
    </>
  );
}
