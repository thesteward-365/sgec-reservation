import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../lib/services/user-service';
import { UserRepository } from '../lib/repositories/user-repository';

vi.mock('../lib/repositories/user-repository');

describe('UserService', () => {
  const mockAdmin = { id: 1, role: 'admin' };
  const mockUser = { id: 2, role: 'user' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateUserStatus', () => {
    it('should update status if actor is admin', async () => {
      vi.mocked(UserRepository.findById).mockResolvedValue({ id: 10, status: 'pending' } as any);
      vi.mocked(UserRepository.update).mockResolvedValue({ id: 10, status: 'approved' } as any);

      const result = await UserService.updateUserStatus(10, 'approved', mockAdmin);
      expect(result.status).toBe('approved');
      expect(UserRepository.update).toHaveBeenCalledWith(10, { status: 'approved' });
    });

    it('should throw error if actor is not admin', async () => {
      await expect(UserService.updateUserStatus(10, 'approved', mockUser))
        .rejects.toThrow('Unauthorized');
    });
  });

  describe('updateUserRole', () => {
    it('should update role if actor is admin', async () => {
      vi.mocked(UserRepository.findById).mockResolvedValue({ id: 10, role: 'user' } as any);
      vi.mocked(UserRepository.update).mockResolvedValue({ id: 10, role: 'admin' } as any);

      const result = await UserService.updateUserRole(10, 'admin', mockAdmin);
      expect(result.role).toBe('admin');
      expect(UserRepository.update).toHaveBeenCalledWith(10, { role: 'admin' });
    });
  });

  describe('forceUpdateUserProfile', () => {
    it('should update name, phone, and departmentId if actor is admin', async () => {
      vi.mocked(UserRepository.findById).mockResolvedValue({ id: 10, name: 'Old Name' } as any);
      vi.mocked(UserRepository.update).mockResolvedValue({ id: 10, name: 'New Name', departmentId: 5 } as any);

      const result = await UserService.forceUpdateUserProfile(
        10,
        { name: 'New Name', phoneNumber: '01011112222', departmentId: 5 },
        mockAdmin
      );
      expect(result.name).toBe('New Name');
      expect(result.departmentId).toBe(5);
      expect(UserRepository.update).toHaveBeenCalledWith(10, {
        name: 'New Name',
        phoneNumber: '01011112222',
        departmentId: 5,
      });
    });

    it('should throw error if actor is not admin', async () => {
      await expect(
        UserService.forceUpdateUserProfile(
          10,
          { name: 'New Name', departmentId: 5 },
          mockUser
        )
      ).rejects.toThrow('Unauthorized');
    });
  });
});
