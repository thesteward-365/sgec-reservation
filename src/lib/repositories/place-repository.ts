import { db, places, placeTags, floors } from '@/lib/db';
import { eq, and, inArray, max } from 'drizzle-orm';

export class PlaceRepository {
  static async findAll(tx: any = db) {
    const query = tx.select().from(places).orderBy(places.sortOrder);
    return await query;
  }

  static async findById(id: number, tx: any = db) {
    const query = tx.select().from(places).where(eq(places.id, id)).limit(1);
    const rows = await query;
    return rows[0] || null;
  }

  static async getMaxSortOrder(tx: any = db) {
    const query = tx.select({ val: max(places.sortOrder) }).from(places);
    const rows = await query;
    return rows[0]?.val ?? -1;
  }

  static create(
    data: {
      name: string;
      floorId: number;
      description?: string | null;
      sortOrder: number;
    },
    tx: any = db
  ) {
    const query = tx.insert(places).values(data).returning();
    return query.then((rows: any[]) => rows[0]);
  }

  static update(
    id: number,
    data: Partial<{
      name: string;
      floorId: number;
      description?: string | null;
      sortOrder?: number;
      isPinned: boolean;
    }>,
    tx: any = db
  ) {
    const query = tx
      .update(places)
      .set(data)
      .where(eq(places.id, id))
      .returning();
    return query.then((rows: any[]) => rows[0]);
  }

  static delete(id: number, tx: any = db) {
    const query = tx.delete(places).where(eq(places.id, id)).returning();
    return query.then((rows: any[]) => rows[0]);
  }

  // Tags 관계 관리
  static syncTags(placeId: number, tagIds: number[], tx: any = db) {
    const deleteQuery = tx
      .delete(placeTags)
      .where(eq(placeTags.placeId, placeId));

    return deleteQuery.then(() => {
      if (tagIds.length > 0) {
        const values = tagIds.map((tagId) => ({ placeId, tagId }));
        return tx.insert(placeTags).values(values);
      }
    });
  }

  static async findFloorById(id: number, tx: any = db) {
    const query = tx.select().from(floors).where(eq(floors.id, id)).limit(1);
    const rows = await query;
    return rows[0] || null;
  }
}
