import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReservationService } from '../lib/services/reservation-service';
import { ReservationRepository } from '../lib/repositories/reservation-repository';
import { UserRepository } from '../lib/repositories/user-repository';

// Mocking dependencies
vi.mock('../lib/db', () => ({
  db: {
    transaction: vi.fn((cb) =>
      cb({
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      })
    ),
  },
  fromDbDate: vi.fn((d) => new Date(d)),
}));

vi.mock('../lib/repositories/reservation-repository');
vi.mock('../lib/repositories/user-repository');
vi.mock('../lib/repositories/place-repository', () => ({
  PlaceRepository: {
    findById: vi.fn().mockResolvedValue({ id: 1, name: 'Test Place' }),
  },
}));
vi.mock('../lib/calendar/calendar-service', () => ({
  updateGoogleEvent: vi.fn().mockResolvedValue(undefined),
  deleteGoogleEvent: vi.fn().mockResolvedValue(undefined),
}));

type MockUser = Awaited<ReturnType<typeof UserRepository.findById>>;

describe('ReservationService', () => {
  const mockActor = { id: 1, name: 'Test User', role: 'user' };
  const mockAdmin = { id: 99, name: 'Admin User', role: 'admin' };

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const mockData = {
    placeId: 1,
    startTime: new Date(futureDate.getTime()),
    endTime: new Date(futureDate.getTime() + 3600000),
    purpose: 'Test Meeting',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createReservation', () => {
    it('should create a reservation if there are no conflicts', async () => {
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([]);
      vi.mocked(ReservationRepository.create).mockResolvedValue({
        id: 1,
        ...mockData,
        userId: 1,
      });

      const result = await ReservationService.createReservation(
        mockActor,
        mockData
      );

      expect(result.id).toBe(1);
      expect(ReservationRepository.create).toHaveBeenCalled();
      expect(ReservationRepository.createHistory).toHaveBeenCalled();
      expect(vi.mocked(ReservationRepository.createHistory).mock.calls[0]?.[0])
        .toMatchObject({
          actionType: 'created',
          changes: expect.any(String),
        });

      const changes = JSON.parse(
        vi.mocked(ReservationRepository.createHistory).mock.calls[0]![0].changes
      );
      expect(changes.snapshot).toMatchObject({
        placeId: mockData.placeId,
        placeName: 'Test Place',
        userName: mockActor.name,
        purpose: mockData.purpose,
      });
    });

    it('should throw an error if there is a conflict', async () => {
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([
        { id: 2 },
      ]);

      await expect(
        ReservationService.createReservation(mockActor, mockData)
      ).rejects.toThrow('해당 시간에 이미 예약이 있습니다.');
    });
  });

  describe('updateReservation', () => {
    it('should update a reservation successfully', async () => {
      const mockCurrent = { id: 1, ...mockData, userId: 1, status: 'active' };
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(
        mockCurrent
      );
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([]);
      vi.mocked(ReservationRepository.update).mockResolvedValue({
        ...mockCurrent,
        purpose: 'Updated',
      });

      const result = await ReservationService.updateReservation(1, mockActor, {
        ...mockData,
        purpose: 'Updated',
      });

      expect(result.purpose).toBe('Updated');
      expect(ReservationRepository.update).toHaveBeenCalled();
    });

    it('should throw error if reservation not found or no permission', async () => {
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(null);

      await expect(
        ReservationService.updateReservation(1, mockActor, mockData)
      ).rejects.toThrow('예약을 찾을 수 없거나 권한이 없습니다.');
    });

    it('should allow admin to update any reservation', async () => {
      const mockCurrent = { id: 1, ...mockData, userId: 10, status: 'active' }; // owned by another user
      vi.mocked(ReservationRepository.findById).mockResolvedValue(mockCurrent);
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([]);
      vi.mocked(ReservationRepository.update).mockResolvedValue({
        ...mockCurrent,
        purpose: 'Admin Update',
      });

      const result = await ReservationService.updateReservation(1, mockAdmin, {
        ...mockData,
        purpose: 'Admin Update',
      });

      expect(result.purpose).toBe('Admin Update');
      expect(ReservationRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw error when updating a past reservation', async () => {
      const pastDate = new Date('2026-04-01T10:00:00Z');
      const mockCurrent = {
        id: 1,
        ...mockData,
        userId: 1,
        startTime: pastDate,
        endTime: pastDate,
        status: 'active',
      };
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(
        mockCurrent
      );

      await expect(
        ReservationService.updateReservation(1, mockActor, mockData)
      ).rejects.toThrow('지난 예약은 수정할 수 없습니다.');
    });

    it('should throw error if update conflicts with another reservation', async () => {
      const mockCurrent = { id: 1, ...mockData, userId: 1, status: 'active' };
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(
        mockCurrent
      );
      // Conflict exists with another reservation (id: 2)
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([
        { id: 2 },
      ]);

      await expect(
        ReservationService.updateReservation(1, mockActor, mockData)
      ).rejects.toThrow('해당 시간에 이미 예약이 있습니다.');
    });

    it('should return current reservation if no changes are made', async () => {
      const mockCurrent = { id: 1, ...mockData, userId: 1, status: 'active' };
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(
        mockCurrent
      );
      vi.mocked(ReservationRepository.findConflicts).mockResolvedValue([]);

      const result = await ReservationService.updateReservation(
        1,
        mockActor,
        mockData
      );

      expect(result).toEqual(mockCurrent);
      expect(ReservationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelReservation', () => {
    it('should cancel a reservation successfully', async () => {
      const mockCurrent = {
        id: 1,
        ...mockData,
        userId: 1,
        googleEventId: 'abc',
        status: 'active',
      };
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(
        mockCurrent
      );
      vi.mocked(ReservationRepository.update).mockResolvedValue({
        ...mockCurrent,
        status: 'cancelled',
      });
      vi.mocked(UserRepository.findById).mockResolvedValue({
        id: 1,
        name: 'Reservation Owner',
      } as MockUser);

      const result = await ReservationService.cancelReservation(1, mockActor);

      expect(result.status).toBe('cancelled');
      expect(ReservationRepository.update).toHaveBeenCalledWith(
        1,
        { status: 'cancelled' },
        expect.anything()
      );
      expect(vi.mocked(ReservationRepository.createHistory).mock.calls[0]?.[0])
        .toMatchObject({
          actionType: 'cancelled',
          changes: expect.any(String),
        });

      const changes = JSON.parse(
        vi.mocked(ReservationRepository.createHistory).mock.calls[0]![0].changes
      );
      expect(changes.snapshot).toMatchObject({
        placeId: mockData.placeId,
        placeName: 'Test Place',
        userName: 'Reservation Owner',
        purpose: mockData.purpose,
      });
    });

    it('should allow admin to cancel any reservation', async () => {
      const mockCurrent = { id: 1, ...mockData, userId: 10, status: 'active' };
      vi.mocked(ReservationRepository.findById).mockResolvedValue(mockCurrent);
      vi.mocked(ReservationRepository.update).mockResolvedValue({
        ...mockCurrent,
        status: 'cancelled',
      });
      vi.mocked(UserRepository.findById).mockResolvedValue({
        id: 10,
        name: 'Another User',
      } as MockUser);

      const result = await ReservationService.cancelReservation(1, mockAdmin);

      expect(result.status).toBe('cancelled');
      expect(ReservationRepository.findById).toHaveBeenCalled();
      expect(ReservationRepository.update).toHaveBeenCalled();
    });

    it('should throw error if reservation is already cancelled', async () => {
      const mockCurrent = {
        id: 1,
        ...mockData,
        userId: 1,
        status: 'cancelled',
      };
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(
        mockCurrent
      );

      await expect(
        ReservationService.cancelReservation(1, mockActor)
      ).rejects.toThrow('이미 취소된 예약입니다.');
    });

    it('should throw error if cancelling unauthorized reservation', async () => {
      vi.mocked(ReservationRepository.findByIdAndUser).mockResolvedValue(null);

      await expect(
        ReservationService.cancelReservation(1, mockActor)
      ).rejects.toThrow('예약을 찾을 수 없거나 권한이 없습니다.');
    });
  });
});
