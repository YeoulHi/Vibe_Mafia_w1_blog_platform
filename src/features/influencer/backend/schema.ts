import { z } from 'zod';

// 채널 타입 정의
export const channelTypeSchema = z.enum([
  'NAVER_BLOG',
  'YOUTUBE',
  'INSTAGRAM',
  'THREADS',
]);

// 단일 채널 스키마
export const channelSchema = z.object({
  channel_type: channelTypeSchema,
  channel_name: z.string().min(1, '채널 이름을 입력해주세요'),
  channel_url: z.string().url('올바른 URL 형식을 입력해주세요'),
  follower_count: z.number().int().min(0, '팔로워 수는 0 이상이어야 합니다'),
});

// 인플루언서 프로필 업데이트 요청 스키마
export const updateInfluencerProfileSchema = z.object({
  channels: z.array(channelSchema).min(0, '채널 정보를 추가해주세요'),
});

// 타입 export
export type ChannelType = z.infer<typeof channelTypeSchema>;
export type Channel = z.infer<typeof channelSchema>;
export type UpdateInfluencerProfileRequest = z.infer<typeof updateInfluencerProfileSchema>;