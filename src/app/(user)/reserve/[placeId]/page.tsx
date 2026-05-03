import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { db } from '@/lib/db';
import { places, floors, placeTags, tags } from '@/lib/db/schema';
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

  const tagRows = await db
    .select({ name: tags.name })
    .from(placeTags)
    .leftJoin(tags, eq(placeTags.tagId, tags.id))
    .where(eq(placeTags.placeId, id));

  const tagNames = tagRows.map(t => t.name).filter((n): n is string => n !== null);

  return (
    <PlaceDetailView
      place={{ ...place, tags: tagNames }}
      currentUser={{ id: session.user.id, name: session.user.name }}
      initialDate={date}
    />
  );
}
