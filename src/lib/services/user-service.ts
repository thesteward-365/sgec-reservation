import { UserRepository } from '../repositories/user-repository';

export interface UserActor {
  id: number;
  role: string;
}

export class UserService {
  /**
   * 사용자 상태를 변경합니다 (승인/거절).
   */
  static async updateUserStatus(userId: number, status: 'approved' | 'rejected', actor: UserActor) {
    if (actor.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await UserRepository.update(userId, { status });
  }

  /**
   * 사용자 역할을 변경합니다 (일반/관리자).
   */
  static async updateUserRole(userId: number, role: 'user' | 'admin', actor: UserActor) {
    if (actor.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await UserRepository.update(userId, { role });
  }
}
