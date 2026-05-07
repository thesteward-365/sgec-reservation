import { db } from '@/lib/db';
import { PlaceRepository } from '../repositories/place-repository';

export class PlaceService {
  static async createPlace(data: {
    name: string;
    floorId: number;
    description?: string | null;
    tagIds?: number[];
  }) {
    const floor = await PlaceRepository.findFloorById(data.floorId);
    if (!floor) throw new Error('Floor not found');

    return await db.transaction(async (tx) => {
      const maxOrder = await PlaceRepository.getMaxSortOrder(tx);
      
      const place = await PlaceRepository.create({
        name: data.name,
        floorId: data.floorId,
        description: data.description,
        sortOrder: maxOrder + 1,
      }, tx);

      if (data.tagIds && data.tagIds.length > 0) {
        await PlaceRepository.syncTags(place.id, data.tagIds, tx);
      }

      return place;
    });
  }

  static async updatePlace(id: number, data: {
    name?: string;
    floorId?: number;
    description?: string | null;
    tagIds?: number[];
    isPinned?: number;
  }) {
    const current = await PlaceRepository.findById(id);
    if (!current) throw new Error('Place not found');

    if (data.floorId) {
      const floor = await PlaceRepository.findFloorById(data.floorId);
      if (!floor) throw new Error('Floor not found');
    }

    return await db.transaction(async (tx) => {
      const updated = await PlaceRepository.update(id, {
        name: data.name,
        floorId: data.floorId,
        description: data.description,
        isPinned: data.isPinned,
      }, tx);

      if (data.tagIds) {
        await PlaceRepository.syncTags(id, data.tagIds, tx);
      }

      return updated;
    });
  }

  static async deletePlace(id: number) {
    const current = await PlaceRepository.findById(id);
    if (!current) throw new Error('Place not found');

    return await PlaceRepository.delete(id);
  }
}
