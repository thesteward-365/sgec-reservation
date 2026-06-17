import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionOptions, SessionData } from '@/lib/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export default async function RootPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user) {
    redirect('/login');
  }

  // DB에서 최신 정보를 가져와 상태 확인
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || user.status === 'rejected' || user.status === 'withdrawn') {
    redirect('/api/auth/logout');
  }



  if (user.status === 'approved') {
    redirect('/reserve');
  }

  redirect('/pending');
}
