import {
  db,
  reservations,
  reservationHistories,
  places,
  toDbDate,
} from '@/lib/db';
import { eq, and, ne, lt, gt } from 'drizzle-orm';

export class ReservationRepository {
  /**
   * ID로 예약 정보를 조회합니다.
   */
  static async findById(id: number, tx: any = db) {
    const query = tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    const rows = await query;
    return rows[0] || null;
  }

  /**
   * ID와 사용자 ID로 예약 정보를 조회합니다. (권한 확인용)
   */
  static async findByIdAndUser(id: number, userId: number, tx: any = db) {
    const query = tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.id, id), eq(reservations.userId, userId)))
      .limit(1);

    const rows = await query;
    return rows[0] || null;
  }

  /**
   * 특정 장소와 시간대에 겹치는 예약이 있는지 확인합니다.
   */
  static async findConflicts(
    placeId: number,
    start: Date,
    end: Date,
    excludeId?: number,
    tx: any = db
  ) {
    const startVal = toDbDate(start);
    const endVal = toDbDate(end);

    const conditions = [
      eq(reservations.placeId, placeId),
      lt(reservations.startTime, endVal as any),
      gt(reservations.endTime, startVal as any),
      eq(reservations.status, 'active'),
    ];

    if (excludeId) {
      conditions.push(ne(reservations.id, excludeId));
    }

    const query = tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(and(...conditions));

    return await query;
  }

  /**
   * 새로운 예약을 생성합니다.
   */
  static create(
    data: {
      userId: number;
      placeId: number;
      startTime: Date;
      endTime: Date;
      purpose: string;
      googleEventId?: string | null;
    },
    tx: any = db
  ) {
    const dbData = {
      ...data,
      startTime: toDbDate(data.startTime),
      endTime: toDbDate(data.endTime),
    };

    const query = tx.insert(reservations).values(dbData).returning();
    return query.then((rows: any[]) => rows[0]);
  }

  /**
   * 예약 정보를 업데이트합니다.
   */
  static update(
    id: number,
    data: {
      placeId?: number;
      startTime?: Date;
      endTime?: Date;
      purpose?: string;
      googleEventId?: string | null;
      status?: 'active' | 'cancelled';
    },
    tx: any = db
  ) {
    const dbData: any = { ...data };
    if (data.startTime) dbData.startTime = toDbDate(data.startTime);
    if (data.endTime) dbData.endTime = toDbDate(data.endTime);

    const touchesReservationState = Object.keys(data).some(
      (key) => key !== 'googleEventId'
    );
    if (touchesReservationState) {
      dbData.updatedAt = toDbDate(new Date());
    }

    const query = tx
      .update(reservations)
      .set(dbData)
      .where(eq(reservations.id, id))
      .returning();

    return query.then((rows: any[]) => rows[0]);
  }

  /**
   * 예약을 삭제합니다.
   */
  static delete(id: number, tx: any = db) {
    const query = tx
      .delete(reservations)
      .where(eq(reservations.id, id))
      .returning();

    return query.then((rows: any[]) => rows[0]);
  }

  /**
   * 변경 이력을 생성합니다.
   */
  static createHistory(
    data: {
      reservationId: number;
      actorUserId: number;
      actorUserName: string;
      actionType: 'created' | 'updated' | 'cancelled';
      changes: string;
      googleEventId?: string | null;
    },
    tx: any = db
  ) {
    const query = tx.insert(reservationHistories).values(data).returning();

    return query.then((rows: any[]) => rows[0]);
  }

  /**
   * 장소 존재 여부를 확인합니다.
   */
  static async findPlaceById(id: number, tx: any = db) {
    const query = tx
      .select({ id: places.id })
      .from(places)
      .where(eq(places.id, id))
      .limit(1);
    const rows = await query;
    return rows[0] || null;
  }
}
