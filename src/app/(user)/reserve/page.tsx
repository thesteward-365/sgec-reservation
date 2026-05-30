import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { ReserveView } from './_components/reserve-view';
import { BrandHeader } from '@/components/layout/brand-header';

function ReserveSkeleton() {
  return (
    <div className="flex flex-col">
      <BrandHeader
        action={<div className="bg-muted h-10 w-10 animate-pulse rounded-xl" />}
      />
      <div className="px-5 pt-2 pb-4">
        <div className="bg-muted h-14 w-48 animate-pulse rounded-lg" />
      </div>
      <div className="bg-muted mx-5 mb-4 h-24 animate-pulse rounded-lg" />
      <div className="flex flex-col gap-2 px-5 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-20 animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function ReservePageInner() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  const userName = session.user?.name;
  return <ReserveView userName={userName} />;
}

export default function ReservePage() {
  return (
    <Suspense fallback={<ReserveSkeleton />}>
      <ReservePageInner />
    </Suspense>
  );
}
