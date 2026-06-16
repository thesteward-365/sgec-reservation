import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { UserService } from '@/lib/services/user-service';
import { db, users, departments } from '@/lib/db';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

type PatchBody =
  | { action: 'approve' | 'reject' }
  | { action: 'set-role'; role: 'user' | 'admin' }
  | { action: 'set-status'; status: 'approved' | 'rejected' }
  | { action: 'force-update'; name?: string; phoneNumber?: string; departmentId?: number | null }
  | { action: 'reset-password'; newPassword: string };

export async function GET(request: NextRequest, { params }: Params) {
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

    const userRow = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        phoneNumber: users.phoneNumber,
        departmentId: users.departmentId,
        department: departments.name,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (userRow.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const u = userRow[0];
    return NextResponse.json({
      ...u,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : null,
    });
  } catch (error: any) {
    console.error('GET /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
        updated = await UserService.forceUpdateUserProfile(userId, { name: body.name, phoneNumber: body.phoneNumber, departmentId: body.departmentId }, session.user);
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

    if (updated) {
      const userRow = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          phoneNumber: users.phoneNumber,
          departmentId: users.departmentId,
          department: departments.name,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(eq(users.id, userId))
        .limit(1);

      if (userRow.length > 0) {
        const u = userRow[0];
        updated = {
          ...u,
          createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : null,
        };
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    const status = error.message === 'User not found' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
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

    await UserService.deleteUser(userId, session.user);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    const status =
      error.message === 'User not found'
        ? 404
        : error.message === '자기 자신은 삭제할 수 없습니다.'
          ? 400
          : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
