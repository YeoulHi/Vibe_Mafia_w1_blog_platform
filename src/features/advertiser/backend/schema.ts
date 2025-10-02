import { z } from 'zod';

const BUSINESS_NUMBER_REGEX = /^\d{3}-\d{2}-\d{5}$/;
const PHONE_REGEX = /^0\d{1,2}-\d{3,4}-\d{4}$/;

export const advertiserProfileSchema = z.object({
  company_name: z
    .string({ required_error: '업체명을 입력해주세요.' })
    .min(1, '업체명을 입력해주세요.'),
  location: z
    .string({ required_error: '업체 주소를 입력해주세요.' })
    .min(1, '업체 주소를 입력해주세요.'),
  company_phone: z
    .string({ required_error: '매장 전화번호를 입력해주세요.' })
    .regex(PHONE_REGEX, '전화번호 형식이 올바르지 않습니다.'),
  business_number: z
    .string({ required_error: '사업자등록번호를 입력해주세요.' })
    .regex(BUSINESS_NUMBER_REGEX, '사업자등록번호 형식이 올바르지 않습니다.'),
  owner_name: z
    .string({ required_error: '대표자명을 입력해주세요.' })
    .min(1, '대표자명을 입력해주세요.'),
});

export type UpdateAdvertiserProfileRequest = z.infer<typeof advertiserProfileSchema>;
