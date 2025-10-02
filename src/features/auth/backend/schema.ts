import { z } from 'zod';

export const SignUpSchema = z.object({
  email: z.string().email({ message: '유효한 이메일 주소를 입력해주세요.' }),
  password: z
    .string()
    .min(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' }),
  name: z
    .string()
    .min(1, { message: '이름을 입력해주세요.' })
    .max(100, { message: '이름은 최대 100자까지 입력 가능합니다.' }),
  phone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, {
      message: '유효한 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)',
    }),
  birthdate: z.string().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: '생년월일은 YYYY-MM-DD 형식이어야 합니다.',
  })),
  role: z.enum(['advertiser', 'influencer'], {
    required_error: '역할을 선택해주세요.',
    invalid_type_error: '역할은 광고주 또는 인플루언서여야 합니다.',
  }),
});

export type SignUpRequest = z.infer<typeof SignUpSchema>;

export const SignUpResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['advertiser', 'influencer']),
});

export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;

export const UserTableRowSchema = z.object({
  id: z.number(),
  auth_id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  birthdate: z.string(),
  role: z.enum(['advertiser', 'influencer']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type UserRow = z.infer<typeof UserTableRowSchema>;
