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

  // DB에서 최신 정보를 가져와 마이그레이션 여부 확인
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (user && !user.username) {
    redirect('/setup-account');
  }

  if (user?.status === 'approved') {
    redirect('/reserve');
  }

  redirect('/pending');
}
