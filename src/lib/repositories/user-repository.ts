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
    departmentId: number | null;
    role: 'user' | 'admin';
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  }>, tx: any = db) {
    const rows = await tx.update(users).set(data).where(eq(users.id, id)).returning();
    return rows[0];
  }

  /**
   * 유저를 완전히 삭제합니다.
   * reservations.user_id는 SET NULL 전략으로 예약 데이터는 보존됩니다.
   */
  static async deleteById(id: number, tx: any = db): Promise<void> {
    await tx.delete(users).where(eq(users.id, id));
  }
}
