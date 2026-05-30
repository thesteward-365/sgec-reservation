import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { db, places, floors, placeTags, tags, reservations, fromDbDate } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { PlaceDetailView } from './_components/place-detail-view';
import { isModifiable } from '@/lib/validations/reservation';

type PageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{
    date?: string;
    reservationId?: string;
    backUrl?: string;
    startMin?: string;
    endMin?: string;
  }>;
};

export default async function PlaceDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { placeId } = await params;
  const { date, reservationId, backUrl, startMin, endMin } = await searchParams;

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.user) redirect('/login');

  const id = parseInt(placeId);
  if (isNaN(id)) notFound();

  const [place] = await db
    .select({
      id: places.id,
      name: places.name,
      description: places.description,
      floorName: floors.name,
    })
    .from(places)
    .leftJoin(floors, eq(places.floorId, floors.id))
    .where(eq(places.id, id));

  if (!place) notFound();

  const tagRows = await db
    .select({ name: tags.name })
    .from(placeTags)
    .leftJoin(tags, eq(placeTags.tagId, tags.id))
    .where(eq(placeTags.placeId, id));

  const tagNames = tagRows
    .map((t) => t.name)
    .filter((n): n is string => n !== null);

  let initialReservation: any | undefined;

  if (reservationId) {
    const parsedReservationId = parseInt(reservationId);
    if (isNaN(parsedReservationId)) notFound();

    const reservationFilter =
      session.user?.role === 'admin'
        ? eq(reservations.id, parsedReservationId)
        : and(
            eq(reservations.id, parsedReservationId),
            eq(reservations.userId, Number(session.user.id))
          );

    const [reservation] = await db
      .select({
        id: reservations.id,
        placeId: reservations.placeId,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        purpose: reservations.purpose,
      })
      .from(reservations)
      .where(reservationFilter);

    if (!reservation) notFound();
    
    const start = fromDbDate(reservation.startTime);
    const end = fromDbDate(reservation.endTime);

    // 관리자가 아니면서 수정 가능 기간이 지난 예약은 수정할 수 없음
    if (session.user.role !== 'admin' && !isModifiable(end)) {
      redirect(backUrl ?? '/my-reservations');
    }

    initialReservation = {
      ...reservation,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  }

  return (
    <PlaceDetailView
      key={`${place.id}-${reservationId ?? 'new'}-${date ?? 'today'}`}
      place={{ ...place, tags: tagNames }}
      initialDate={date}
      initialReservation={initialReservation}
      initialStartMin={startMin ? parseInt(startMin) : undefined}
      initialEndMin={endMin ? parseInt(endMin) : undefined}
      backUrl={backUrl ?? undefined}
    />
  );
}
