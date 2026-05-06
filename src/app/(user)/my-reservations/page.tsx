import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { MyReservationsView } from './_components/my-reservations-view';

export default async function MyReservationsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) redirect('/login');

  return (
    <>
      <MyReservationsView />
      <Link
        href="/reserve"
        className="fixed right-5 bottom-24 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--color-fg-strong) text-white shadow-[0_10px_20px_rgba(0,0,0,0.16)] transition hover:bg-(--color-fg-strong)/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="예약하기"
      >
        <PlusIcon className="h-6 w-6" aria-hidden="true" />
      </Link>
    </>
  );
}
