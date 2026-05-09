import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.destroy();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
