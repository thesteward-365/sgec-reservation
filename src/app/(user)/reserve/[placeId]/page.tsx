import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags, reservations } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { PlaceDetailView } from './_components/place-detail-view';

type PageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{
    date?: string;
    reservationId?: string;
    backUrl?: string;
  }>;
};

export default async function PlaceDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { placeId } = await params;
  const { date, reservationId, backUrl } = await searchParams;

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

  let initialReservation:
    | {
        id: number;
        placeId: number;
        startTime: Date;
        endTime: Date;
        purpose: string;
      }
    | undefined;

  if (reservationId) {
    const parsedReservationId = parseInt(reservationId);
    if (isNaN(parsedReservationId)) notFound();

    const reservationFilter =
      session.user?.role === 'admin'
        ? eq(reservations.id, parsedReservationId)
        : and(
            eq(reservations.id, parsedReservationId),
            eq(reservations.userId, session.user.id)
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
    if (reservation.endTime < new Date()) redirect('/my-reservations');

    initialReservation = reservation;
  }

  return (
    <PlaceDetailView
      place={{ ...place, tags: tagNames }}
      initialDate={date}
      initialReservation={initialReservation}
      backUrl={backUrl ?? undefined}
    />
  );
}
