import { db, isPostgres } from '@/lib/db';
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

    const performTransaction = (tx: any) => {
      const maxOrderResult = PlaceRepository.getMaxSortOrder(tx);
      
      const setupPlace = (maxOrder: number) => {
        const place = PlaceRepository.create({
          name: data.name,
          floorId: data.floorId,
          description: data.description,
          sortOrder: maxOrder + 1,
        }, tx);

        if (isPostgres) {
          return (place as Promise<any>).then(async (p) => {
            if (data.tagIds && data.tagIds.length > 0) {
              await PlaceRepository.syncTags(p.id, data.tagIds, tx);
            }
            return p;
          });
        } else {
          if (data.tagIds && data.tagIds.length > 0) {
            PlaceRepository.syncTags(place.id, data.tagIds, tx);
          }
          return place;
        }
      };

      if (isPostgres) {
        return (maxOrderResult as Promise<number>).then(setupPlace);
      } else {
        return setupPlace(maxOrderResult as number);
      }
    };

    return isPostgres
      ? await db.transaction(async (tx) => await performTransaction(tx))
      : db.transaction((tx) => performTransaction(tx));
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

    const performTransaction = (tx: any) => {
      const updated = PlaceRepository.update(id, {
        name: data.name,
        floorId: data.floorId,
        description: data.description,
        isPinned: data.isPinned,
      }, tx);

      if (isPostgres) {
        return (updated as Promise<any>).then(async (res) => {
          if (data.tagIds) {
            await PlaceRepository.syncTags(id, data.tagIds, tx);
          }
          return res;
        });
      } else {
        if (data.tagIds) {
          PlaceRepository.syncTags(id, data.tagIds, tx);
        }
        return updated;
      }
    };

    return isPostgres
      ? await db.transaction(async (tx) => await performTransaction(tx))
      : db.transaction((tx) => performTransaction(tx));
  }

  static async deletePlace(id: number) {
    const current = await PlaceRepository.findById(id);
    if (!current) throw new Error('Place not found');

    return await PlaceRepository.delete(id);
  }
}
