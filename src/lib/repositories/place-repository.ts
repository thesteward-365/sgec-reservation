import { db, places, placeTags, floors, tags, isPostgres } from '@/lib/db';
import { eq, and, inArray, max } from 'drizzle-orm';

export class PlaceRepository {
  static async findAll(tx: any = db) {
    const query = tx.select().from(places).orderBy(places.sortOrder);
    return isPostgres ? await query : query.all();
  }

  static async findById(id: number, tx: any = db) {
    const query = tx.select().from(places).where(eq(places.id, id)).limit(1);
    const rows = isPostgres ? await query : query.all();
    return rows[0] || null;
  }

  static async getMaxSortOrder(tx: any = db) {
    const query = tx.select({ val: max(places.sortOrder) }).from(places);
    const rows = isPostgres ? await query : query.all();
    return rows[0]?.val ?? -1;
  }

  static create(data: {
    name: string;
    floorId: number;
    description?: string | null;
    sortOrder: number;
  }, tx: any = db) {
    const query = tx.insert(places).values(data).returning();
    if (isPostgres) {
      return query.then((rows: any[]) => rows[0]);
    } else {
      return query.all()[0];
    }
  }

  static update(id: number, data: Partial<{
    name: string;
    floorId: number;
    description?: string | null;
    sortOrder?: number;
    isPinned: number;
  }>, tx: any = db) {
    const query = tx.update(places).set(data).where(eq(places.id, id)).returning();
    if (isPostgres) {
      return query.then((rows: any[]) => rows[0]);
    } else {
      return query.all()[0];
    }
  }

  static delete(id: number, tx: any = db) {
    const query = tx.delete(places).where(eq(places.id, id)).returning();
    if (isPostgres) {
      return query.then((rows: any[]) => rows[0]);
    } else {
      return query.all()[0];
    }
  }

  // Tags 관계 관리
  static syncTags(placeId: number, tagIds: number[], tx: any = db) {
    const deleteQuery = tx.delete(placeTags).where(eq(placeTags.placeId, placeId));
    
    if (isPostgres) {
      return deleteQuery.then(() => {
        if (tagIds.length > 0) {
          const values = tagIds.map(tagId => ({ placeId, tagId }));
          return tx.insert(placeTags).values(values);
        }
      });
    } else {
      deleteQuery.run();
      if (tagIds.length > 0) {
        const values = tagIds.map(tagId => ({ placeId, tagId }));
        tx.insert(placeTags).values(values).run();
      }
    }
  }

  static async findFloorById(id: number, tx: any = db) {
    const query = tx.select().from(floors).where(eq(floors.id, id)).limit(1);
    const rows = isPostgres ? await query : query.all();
    return rows[0] || null;
  }
}
