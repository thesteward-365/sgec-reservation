import { describe, it, expect } from 'vitest';
import { authSchema } from '@/lib/validations/auth';

describe('Authentication Validation', () => {
  describe('Username Validation', () => {
    const usernameSchema = authSchema.username;

    it('should accept valid usernames', () => {
      expect(usernameSchema.safeParse('user123').success).toBe(true);
      expect(usernameSchema.safeParse('admin').success).toBe(true);
    });

    it('should reject usernames shorter than 4 characters', () => {
      const result = usernameSchema.safeParse('usr');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('아이디는 4자 이상이어야 합니다.');
      }
    });

    it('should reject usernames longer than 20 characters', () => {
      const result = usernameSchema.safeParse('a'.repeat(21));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('아이디는 20자 이하이어야 합니다.');
      }
    });

    it('should reject usernames not starting with a lowercase letter', () => {
      expect(usernameSchema.safeParse('1user').success).toBe(false);
      expect(usernameSchema.safeParse('User').success).toBe(false);
    });
  });

  describe('Password Validation', () => {
    const passwordSchema = authSchema.password;

    it('should accept valid passwords', () => {
      expect(passwordSchema.safeParse('Password123!').success).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pw123!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('비밀번호는 8자 이상이어야 합니다.');
      }
    });

    it('should reject passwords missing special characters', () => {
      expect(passwordSchema.safeParse('Password123').success).toBe(false);
    });
  });


});
