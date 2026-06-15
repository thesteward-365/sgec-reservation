import { UserRepository } from '../repositories/user-repository';
import bcrypt from 'bcryptjs';

export interface UserActor {
  id: number;
  role: string;
}

export class UserService {
  /**
   * 사용자 상태를 변경합니다 (승인/거절).
   */
  static async updateUserStatus(
    userId: number,
    status: 'approved' | 'rejected',
    actor: UserActor
  ) {
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
  static async updateUserRole(
    userId: number,
    role: 'user' | 'admin',
    actor: UserActor
  ) {
    if (actor.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await UserRepository.update(userId, { role });
  }

  /**
   * 관리자가 사용자 정보를 강제로 수정합니다.
   */
  static async forceUpdateUserProfile(
    userId: number,
    data: { name?: string; phoneNumber?: string },
    actor: UserActor
  ) {
    if (actor.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await UserRepository.update(userId, data);
  }

  /**
   * 사용자의 비밀번호를 강제로 재설정합니다.
   */
  static async forceResetUserPassword(
    userId: number,
    newPassword: string,
    actor: UserActor
  ) {
    if (actor.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return await UserRepository.update(userId, { password: hashedPassword });
  }

  /**
   * 사용자가 자신의 비밀번호를 변경합니다.
   */
  static async changeUserPassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await UserRepository.findById(userId);
    if (!user || !user.password) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return await UserRepository.update(userId, { password: hashedPassword });
  }

  /**
   * 회원 탈퇴 (소프트 삭제: 아이디/비번 삭제, 이름/번호 보존, 상태 변경)
   */
  static async withdrawUser(userId: number, actorId: number) {
    if (userId !== actorId) {
      throw new Error('Unauthorized');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const suffix = ' (탈퇴)';

    // 이름과 전화번호는 남겨두되, 전화번호는 중복 가입 가능하도록 식별자 추가
    return await UserRepository.update(userId, {
      username: undefined, // 아이디 삭제 (재사용 가능하게 함)
      password: undefined, // 로그인 불가
      phoneNumber: user.phoneNumber, // 중복 가입 방지 및 기록 보존
      status: 'withdrawn', // 탈퇴 상태로 변경
    });
  }

  /**
   * 유저를 완전히 삭제합니다 (hard delete).
   * - 관리자만 실행 가능
   * - 자기 자신은 삭제 불가
   * - 예약 데이터는 userId=null로 보존됨 (SET NULL 외래키 전략)
   */
  static async deleteUser(userId: number, actor: UserActor) {
    if (actor.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    if (userId === actor.id) {
      throw new Error('자기 자신은 삭제할 수 없습니다.');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await UserRepository.deleteById(userId);
  }
}
