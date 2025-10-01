import { z } from 'zod';

// GET /api/users/me/role 의 응답 스키마
export const UserRoleResponseSchema = z.object({
  role: z.enum(['advertiser', 'influencer', 'unassigned']),
});

export type UserRoleResponse = z.infer<typeof UserRoleResponseSchema>;
