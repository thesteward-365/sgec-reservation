import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { UserService } from '@/lib/services/user-service';

type Params = { params: Promise<{ id: string }> };

type PatchBody =
  | { action: 'approve' | 'reject' }
  | { action: 'set-role'; role: 'user' | 'admin' }
  | { action: 'set-status'; status: 'approved' | 'rejected' }
  | { action: 'force-update'; name?: string; phoneNumber?: string }
  | { action: 'reset-password'; newPassword: string };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json() as PatchBody;
    let updated;

    switch (body.action) {
      case 'approve':
        updated = await UserService.updateUserStatus(userId, 'approved', session.user);
        break;
      case 'reject':
        updated = await UserService.updateUserStatus(userId, 'rejected', session.user);
        break;
      case 'set-role':
        if (body.role !== 'user' && body.role !== 'admin') {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        updated = await UserService.updateUserRole(userId, body.role, session.user);
        break;
      case 'set-status':
        if (body.status !== 'approved' && body.status !== 'rejected') {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        updated = await UserService.updateUserStatus(userId, body.status, session.user);
        break;
      case 'force-update':
        updated = await UserService.forceUpdateUserProfile(userId, { name: body.name, phoneNumber: body.phoneNumber }, session.user);
        break;
      case 'reset-password':
        if (!body.newPassword || body.newPassword.length < 4) {
          return NextResponse.json({ error: 'Password too short' }, { status: 400 });
        }
        updated = await UserService.forceResetUserPassword(userId, body.newPassword, session.user);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    const status = error.message === 'User not found' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
