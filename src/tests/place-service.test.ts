import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaceService } from '../lib/services/place-service';
import { PlaceRepository } from '../lib/repositories/place-repository';
import { db } from '../lib/db';

vi.mock('../lib/db', () => ({
  db: {
    transaction: vi.fn((cb) => cb({})),
  },
  isPostgres: false,
}));

vi.mock('../lib/repositories/place-repository');

describe('PlaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.transaction).mockImplementation((cb) => {
      return cb({});
    });
    vi.mocked(PlaceRepository.getMaxSortOrder).mockReturnValue(0);
  });

  describe('createPlace', () => {
    it('should create a place and sync tags', async () => {
      vi.mocked(PlaceRepository.findFloorById).mockResolvedValue({ id: 1 } as any);
      vi.mocked(PlaceRepository.create).mockReturnValue({ id: 100, name: 'New Place' } as any);

      const result = await PlaceService.createPlace({
        name: 'New Place',
        floorId: 1,
        tagIds: [1, 2],
      });

      expect(result.id).toBe(100);
      expect(PlaceRepository.create).toHaveBeenCalled();
      expect(PlaceRepository.syncTags).toHaveBeenCalledWith(100, [1, 2], expect.anything());
    });

    it('should throw error if floor not found', async () => {
      vi.mocked(PlaceRepository.findFloorById).mockResolvedValue(null);

      await expect(PlaceService.createPlace({ name: 'Fail', floorId: 99 }))
        .rejects.toThrow('Floor not found');
    });
  });

  describe('deletePlace', () => {
    it('should delete place if it exists', async () => {
      vi.mocked(PlaceRepository.findById).mockResolvedValue({ id: 100 } as any);
      vi.mocked(PlaceRepository.delete).mockResolvedValue({ id: 100 } as any);

      const result = await PlaceService.deletePlace(100);
      expect(result.id).toBe(100);
      expect(PlaceRepository.delete).toHaveBeenCalledWith(100);
    });
  });
});
