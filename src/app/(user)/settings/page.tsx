import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { redirect } from 'next/navigation';
import { SettingsView } from './_components/settings-view';
import pkg from '../../../../package.json';

export default async function SettingsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) redirect('/login');

  const { name, phoneNumber, role } = session.user;

  return (
    <SettingsView
      name={name}
      phoneNumber={phoneNumber}
      role={role}
      version={pkg.version}
    />
  );
}
