import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  session.destroy();

  const requestUrl = new URL(request.url);
  const nginxProto = request.headers.get('x-nginx-proto') || requestUrl.protocol.replace(':', '');
  const nginxHost = request.headers.get('x-nginx-host') || requestUrl.host;
  const proto = nginxProto.startsWith('https') ? 'https' : 'http';
  const absoluteUrl = new URL('/login', `${proto}://${nginxHost}`);
  console.log("############", requestUrl, nginxHost, nginxProto, proto, absoluteUrl)
  return NextResponse.redirect(absoluteUrl, 303);
}

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  session.destroy();

  const requestUrl = new URL(request.url);
  const nginxProto = request.headers.get('x-nginx-proto') || requestUrl.protocol.replace(':', '');
  const nginxHost = request.headers.get('x-nginx-host') || requestUrl.host;
  const proto = nginxProto.startsWith('https') ? 'https' : 'http';
  const absoluteUrl = new URL('/login', `${proto}://${nginxHost}`);

  const response = NextResponse.redirect(absoluteUrl, 307);
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  return response;
}
