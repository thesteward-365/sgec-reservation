import { z } from 'zod';

export const authSchema = {
  username: z
    .string()
    .min(4, '아이디는 4자 이상이어야 합니다.')
    .max(20, '아이디는 20자 이하이어야 합니다.')
    .regex(/^[a-z][a-z0-9]*$/, '영문 소문자와 숫자만 사용할 수 있습니다.'),

  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/,
      '영문, 숫자, 특수문자를 모두 포함해야 합니다.'
    ),

  name: z.string().min(2, '이름을 입력해주세요.'),

  phoneNumber: z
    .string()
    .regex(/^010\d{8}$/, '올바른 전화번호 형식(01012345678)을 입력해주세요.'),
};

export const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const signupSchema = z.object({
  username: authSchema.username,
  password: authSchema.password,
  name: authSchema.name,
  phoneNumber: authSchema.phoneNumber,
});



