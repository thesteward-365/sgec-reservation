import { db } from '@/lib/db';
import { reservations, reservationHistories, places } from '@/lib/db/schema';
import { eq, and, ne, lt, gt } from 'drizzle-orm';

const isPostgres = process.env.DATABASE_TYPE === 'postgres';

/**
 * DB 환경(SQLite vs PostgreSQL)에 따라 Date 타입을 적절히 변환합니다.
 */
function toDbDate(date: Date) {
  // PostgreSQL schema에서는 integer(unix epoch)를 사용하므로 변환 필요
  return isPostgres ? Math.floor(date.getTime() / 1000) : date;
}

export class ReservationRepository {
  /**
   * ID로 예약 정보를 조회합니다.
   */
  static async findById(id: number, tx: any = db) {
    const rows = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * ID와 사용자 ID로 예약 정보를 조회합니다. (권한 확인용)
   */
  static async findByIdAndUser(id: number, userId: number, tx: any = db) {
    const rows = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.id, id), eq(reservations.userId, userId)))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * 특정 장소와 시간대에 겹치는 예약이 있는지 확인합니다.
   */
  static async findConflicts(placeId: number, start: Date, end: Date, excludeId?: number, tx: any = db) {
    const startVal = toDbDate(start);
    const endVal = toDbDate(end);

    const conditions = [
      eq(reservations.placeId, placeId),
      lt(reservations.startTime, endVal as any),
      gt(reservations.endTime, startVal as any),
    ];

    if (excludeId) {
      conditions.push(ne(reservations.id, excludeId));
    }

    return await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(and(...conditions));
  }

  /**
   * 새로운 예약을 생성합니다.
   */
  static async create(data: {
    userId: number;
    placeId: number;
    startTime: Date;
    endTime: Date;
    purpose: string;
    googleEventId?: string | null;
  }, tx: any = db) {
    const dbData = {
      ...data,
      startTime: toDbDate(data.startTime),
      endTime: toDbDate(data.endTime),
    };

    const rows = await tx.insert(reservations).values(dbData).returning();
    return rows[0];
  }

  /**
   * 예약 정보를 업데이트합니다.
   */
  static async update(id: number, data: {
    placeId?: number;
    startTime?: Date;
    endTime?: Date;
    purpose?: string;
    googleEventId?: string | null;
  }, tx: any = db) {
    const dbData: any = { ...data };
    if (data.startTime) dbData.startTime = toDbDate(data.startTime);
    if (data.endTime) dbData.endTime = toDbDate(data.endTime);

    const rows = await tx
      .update(reservations)
      .set(dbData)
      .where(eq(reservations.id, id))
      .returning();
    return rows[0];
  }

  /**
   * 예약을 삭제합니다.
   */
  static async delete(id: number, tx: any = db) {
    const rows = await tx
      .delete(reservations)
      .where(eq(reservations.id, id))
      .returning();
    return rows[0];
  }

  /**
   * 변경 이력을 생성합니다.
   */
  static async createHistory(data: {
    reservationId: number;
    actorUserId: number;
    actorUserName: string;
    actionType: 'created' | 'updated' | 'cancelled';
    changes: string;
    googleEventId?: string | null;
  }, tx: any = db) {
    const rows = await tx.insert(reservationHistories).values(data).returning();
    return rows[0];
  }

  /**
   * 장소 존재 여부를 확인합니다.
   */
  static async findPlaceById(id: number, tx: any = db) {
    const rows = await tx.select({ id: places.id }).from(places).where(eq(places.id, id)).limit(1);
    return rows[0] || null;
  }
}
