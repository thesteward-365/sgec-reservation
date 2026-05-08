import { db, places, placeTags, floors, tags } from '@/lib/db';
import { eq, and, inArray, max } from 'drizzle-orm';

export class PlaceRepository {
  static async findAll(tx: any = db) {
    return await tx.select().from(places).orderBy(places.sortOrder);
  }

  static async findById(id: number, tx: any = db) {
    const rows = await tx.select().from(places).where(eq(places.id, id)).limit(1);
    return rows[0] || null;
  }

  static async getMaxSortOrder(tx: any = db) {
    const [maxRow] = await tx.select({ val: max(places.sortOrder) }).from(places);
    return maxRow?.val ?? -1;
  }

  static async create(data: {
    name: string;
    floorId: number;
    description?: string | null;
    sortOrder: number;
  }, tx: any = db) {
    const rows = await tx.insert(places).values(data).returning();
    return rows[0];
  }

  static async update(id: number, data: Partial<{
    name: string;
    floorId: number;
    description?: string | null;
    sortOrder?: number;
    isPinned: number;
  }>, tx: any = db) {
    const rows = await tx.update(places).set(data).where(eq(places.id, id)).returning();
    return rows[0];
  }

  static async delete(id: number, tx: any = db) {
    const rows = await tx.delete(places).where(eq(places.id, id)).returning();
    return rows[0];
  }

  // Tags 관계 관리
  static async syncTags(placeId: number, tagIds: number[], tx: any = db) {
    // 기존 태그 삭제
    await tx.delete(placeTags).where(eq(placeTags.placeId, placeId));
    
    if (tagIds.length > 0) {
      const values = tagIds.map(tagId => ({ placeId, tagId }));
      await tx.insert(placeTags).values(values);
    }
  }

  static async findFloorById(id: number, tx: any = db) {
    const rows = await tx.select().from(floors).where(eq(floors.id, id)).limit(1);
    return rows[0] || null;
  }
}
