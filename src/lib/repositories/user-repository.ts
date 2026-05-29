import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export class UserRepository {
  static async findById(id: number, tx: any = db) {
    const rows = await tx.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] || null;
  }

  static async update(id: number, data: Partial<{
    name: string;
    username: string;
    password: string;
    phoneNumber: string;
    role: 'user' | 'admin';
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  }>, tx: any = db) {
    const rows = await tx.update(users).set(data).where(eq(users.id, id)).returning();
    return rows[0];
  }
}
