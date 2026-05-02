import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { db } from '@/lib/db';
import { places, floors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { PlaceDetailView } from './_components/place-detail-view';

type PageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function PlaceDetailPage({ params, searchParams }: PageProps) {
  const { placeId } = await params;
  const { date } = await searchParams;

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
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

  return (
    <PlaceDetailView
      place={place}
      currentUser={{ id: session.user.id, name: session.user.name }}
      initialDate={date}
    />
  );
}
