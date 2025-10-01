import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { UserRoleResponse } from './schema';

/**
 * 사용자의 역할을 판별하는 서비스 함수
 * @param supabase - Supabase 클라이언트
 * @param userId - 사용자 ID
 * @returns UserRoleResponse
 */
export const getUserRole = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserRoleResponse> => {
  // 1. 광고주 프로필 확인
  const { data: advertiserProfile, error: advertiserError } = await supabase
    .from('advertiser_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (advertiserError && advertiserError.code !== 'PGRST116') {
    // PGRST116: 행을 찾을 수 없는 경우의 코드. 이 경우는 에러가 아님.
    throw new Error(advertiserError.message);
  }
  if (advertiserProfile) {
    return { role: 'advertiser' };
  }

  // 2. 인플루언서 프로필 확인
  const { data: influencerProfile, error: influencerError } = await supabase
    .from('influencer_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (influencerError && influencerError.code !== 'PGRST116') {
    throw new Error(influencerError.message);
  }
  if (influencerProfile) {
    return { role: 'influencer' };
  }

  // 3. 둘 다 없는 경우
  return { role: 'unassigned' };
};