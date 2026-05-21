import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { AppShell } from '@/components/layout/app-shell';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user) {
    redirect('/login');
  }

  // DB에서 최신 정보를 가져와 마이그레이션 여부 확인
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (user && (!user.username || user.username === user.name)) {
    redirect('/setup-account');
  }

  return <AppShell>{children}</AppShell>;
}
