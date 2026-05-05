import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { db } from '@/lib/db';
import { places, floors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { CheckIcon } from '@heroicons/react/24/outline';
import { ReservationDetailsCard } from '@/components/reservations/reservation-details-card';
import { CompleteActions } from './complete-actions';

type PageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{
    date?: string;
    start?: string;
    end?: string;
    purpose?: string;
    mode?: string;
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

export default async function ReservationCompletePage({
  params,
  searchParams,
}: PageProps) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
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
  const mode = sp.mode === 'edit' ? 'edit' : 'create';
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
      {/* 콘텐츠 */}
      <div className="px-5 pt-14 pb-48">
        {/* 성공 아이콘 */}
        <div className="flex flex-col items-center gap-3 pt-8 pb-6">
          <div
            className="flex size-18 items-center justify-center rounded-full"
            style={{ background: 'var(--color-success-subtle)' }}
          >
            <CheckIcon
              className="size-9"
              style={{ color: 'var(--color-success)', strokeWidth: 2.5 }}
            />
          </div>
          <h2 className="text-h2 text-foreground text-center font-bold">
            {mode === 'edit' ? '예약이 수정되었어요' : '예약이 완료되었어요'}
          </h2>
          <p className="text-caption text-muted-foreground text-center">
            기쁨과 감사함으로 섬깁시다!
          </p>
        </div>

        {/* 상세 정보 카드 */}
        <ReservationDetailsCard rows={rows} tone="surface" />
      </div>

      {/* 고정 하단 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-(--color-neutral-150)">
        <CompleteActions
          placeId={placeId}
          shareText={`장소: ${placeLabel}\n날짜: ${dateLabel}\n시간: ${timeLabel}\n목적: ${purpose || '–'}`}
          backUrl={`/reserve/${placeId}${date ? `?date=${date}` : ''}`}
        />
      </div>
    </>
  );
}
