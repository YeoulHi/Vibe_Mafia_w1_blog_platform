import type { SupabaseClient } from '@supabase/supabase-js';
import type { UpdateInfluencerProfileRequest } from './schema';

export async function checkInfluencerProfileStatus(
  supabase: SupabaseClient,
  userId: number
) {
  // 사용자 role 확인
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError) {
    throw userError;
  }

  const isInfluencer = userData.role === 'influencer';

  if (!isInfluencer) {
    return {
      isInfluencer: false,
      hasProfile: false,
      needsOnboarding: false,
    };
  }

  // influencer_profiles 확인
  const { data: profileData, error: profileError } = await supabase
    .from('influencer_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const hasProfile = !!profileData;

  return {
    isInfluencer: true,
    hasProfile,
    needsOnboarding: !hasProfile,
  };
}

export async function updateInfluencerProfile(
  supabase: SupabaseClient,
  userId: number,
  data: UpdateInfluencerProfileRequest
) {
  // 1. influencer_profiles에 레코드 생성 또는 조회
  const { data: existingProfile, error: profileSelectError } = await supabase
    .from('influencer_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  let influencerId: number;

  if (profileSelectError && profileSelectError.code !== 'PGRST116') {
    throw profileSelectError;
  }

  if (existingProfile) {
    influencerId = existingProfile.id;
  } else {
    const { data: newProfile, error: profileInsertError } = await supabase
      .from('influencer_profiles')
      .insert({ user_id: userId })
      .select('id')
      .single();

    if (profileInsertError) {
      throw profileInsertError;
    }

    influencerId = newProfile.id;
  }

  // 2. 기존 채널 정보 삭제 (upsert 패턴)
  const { error: deleteError } = await supabase
    .from('influencer_channels')
    .delete()
    .eq('influencer_id', influencerId);

  if (deleteError) {
    throw deleteError;
  }

  // 3. 새로운 채널 정보 삽입
  if (data.channels.length > 0) {
    const channelsToInsert = data.channels.map((channel) => ({
      influencer_id: influencerId,
      channel_type: channel.channel_type,
      channel_name: channel.channel_name,
      channel_url: channel.channel_url,
      follower_count: channel.follower_count,
    }));

    const { error: channelsInsertError } = await supabase
      .from('influencer_channels')
      .insert(channelsToInsert);

    if (channelsInsertError) {
      throw channelsInsertError;
    }
  }

  return { influencerId };
}