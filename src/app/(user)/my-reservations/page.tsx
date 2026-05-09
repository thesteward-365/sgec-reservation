import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { redirect } from 'next/navigation';
import { MyReservationsView } from './_components/my-reservations-view';

export default async function MyReservationsPage() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.user) redirect('/login');

  return <MyReservationsView user={session.user} />;
}
