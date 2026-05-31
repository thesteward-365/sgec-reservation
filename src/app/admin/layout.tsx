import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { AdminShell } from '@/components/layout/admin-shell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  // DB에서 최신 정보를 가져와 상태 확인
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || user.status !== 'approved') {
    redirect('/api/auth/logout');
  }

  if (user.role !== 'admin') {
    redirect('/');
  }

  if (user && (!user.username || user.username === user.name)) {
    redirect('/setup-account');
  }

  return <AdminShell>{children}</AdminShell>;
}
