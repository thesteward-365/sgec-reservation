import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { redirect } from 'next/navigation';
import { SettingsView } from './_components/settings-view';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import pkg from '../../../../package.json';

export default async function SettingsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) redirect('/login');

  // Fetch fresh data from DB to ensure username exists (old sessions might miss it)
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) redirect('/login');

  return (
    <SettingsView
      name={user.name}
      username={user.username || ''}
      phoneNumber={user.phoneNumber}
      role={user.role}
      version={pkg.version}
    />
  );
}
