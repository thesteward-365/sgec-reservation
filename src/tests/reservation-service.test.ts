import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from '../lib/services/reservation-service';
import { ReservationRepository } from '../lib/repositories/reservation-repository';
import { db } from '../lib/db';

// Mocking dependencies
vi.mock('../lib/db', () => ({
  db: {
    transaction: vi.fn((cb) => cb({
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('../lib/repositories/reservation-repository');
vi.mock('../lib/calendar/calendar-service', () => ({
  updateGoogleEvent: vi.fn().mockResolvedValue(undefined),
  deleteGoogleEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('ReservationService', () => {
  const mockActor = { id: 1, name: 'Test User', role: 'user' };
  const mockData = {
    placeId: 1,
    startTime: new Date('2026-05-10T10:00:00Z'),
    endTime: new Date('2026-05-10T11:00:00Z'),
    purpose: 'Test Meeting',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReservation', () => {
    it('should create a reservation if there are no conflicts', async () => {
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([]);
      vi.mocked(ReservationRepository.create).mockResolvedValue({ id: 1, ...mockData, userId: 1 });

      const result = await ReservationService.createReservation(mockActor, mockData);

      expect(result.id).toBe(1);
      expect(ReservationRepository.create).toHaveBeenCalled();
      expect(ReservationRepository.createHistory).toHaveBeenCalled();
    });

    it('should throw an error if there is a conflict', async () => {
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([{ id: 2 }]);

      await expect(ReservationService.createReservation(mockActor, mockData))
        .rejects.toThrow('해당 시간에 이미 예약이 있습니다.');
    });
  });

  describe('updateReservation', () => {
    it('should update a reservation successfully', async () => {
      const mockCurrent = { id: 1, ...mockData, userId: 1, endTime: new Date('2026-05-10T12:00:00Z') };
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(mockCurrent);
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([]);
      vi.mocked(ReservationRepository.update).mockResolvedValue({ ...mockCurrent, purpose: 'Updated' });

      const result = await ReservationService.updateReservation(1, mockActor, { ...mockData, purpose: 'Updated' });

      expect(result.purpose).toBe('Updated');
      expect(ReservationRepository.update).toHaveBeenCalled();
    });

    it('should throw error if reservation not found', async () => {
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(null);

      await expect(ReservationService.updateReservation(1, mockActor, mockData))
        .rejects.toThrow('예약을 찾을 수 없거나 권한이 없습니다.');
    });
  });

  describe('cancelReservation', () => {
    it('should cancel a reservation successfully', async () => {
      const mockCurrent = { id: 1, ...mockData, userId: 1, googleEventId: 'abc' };
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(mockCurrent);
      vi.mocked(ReservationRepository.delete).mockResolvedValue(mockCurrent);

      const result = await ReservationService.cancelReservation(1, mockActor);

      expect(result.id).toBe(1);
      expect(ReservationRepository.delete).toHaveBeenCalled();
    });
  });
});
