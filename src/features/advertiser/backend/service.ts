import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, type HandlerResult } from '@/backend/http/response';
import { advertiserErrorCodes, type AdvertiserServiceError } from './error';
import type { UpdateAdvertiserProfileRequest } from './schema';

type UpdateAdvertiserProfileResult = {
  profileId: number;
  isNewProfile: boolean;
};

type UpdateAdvertiserProfileHandlerResult = HandlerResult<
  UpdateAdvertiserProfileResult,
  AdvertiserServiceError,
  unknown
>;

const BUSINESS_NUMBER_CONFLICT_CODE = '23505';
const BUSINESS_NUMBER_CONFLICT_HINT = 'advertiser_profiles_business_number_key';

export async function updateAdvertiserProfile(
  supabase: SupabaseClient,
  userId: number,
  payload: UpdateAdvertiserProfileRequest,
): Promise<UpdateAdvertiserProfileHandlerResult> {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    return failure(
      500,
      advertiserErrorCodes.updateFailed,
      `사용자 정보를 확인하지 못했습니다: ${userError.message}`,
      userError,
    );
  }

  if (!userData) {
    return failure(404, advertiserErrorCodes.notFound, '사용자를 찾을 수 없습니다.');
  }

  if (userData.role !== 'advertiser') {
    return failure(
      403,
      advertiserErrorCodes.forbiddenRole,
      '광고주만 접근할 수 있는 기능입니다.',
    );
  }

  const { data: existingProfile, error: fetchError } = await supabase
    .from('advertiser_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    return failure(
      500,
      advertiserErrorCodes.updateFailed,
      `기존 프로필을 확인하지 못했습니다: ${fetchError.message}`,
      fetchError,
    );
  }

  const profilePayload = {
    user_id: userId,
    company_name: payload.company_name,
    location: payload.location,
    company_phone: payload.company_phone,
    business_number: payload.business_number,
    owner_name: payload.owner_name,
  };

  const { data: upsertedProfile, error: upsertError } = await supabase
    .from('advertiser_profiles')
    .upsert(profilePayload, { onConflict: 'user_id' })
    .select('id')
    .single();

  if (upsertError) {
    const isBusinessConflict =
      'code' in upsertError &&
      upsertError.code === BUSINESS_NUMBER_CONFLICT_CODE &&
      typeof upsertError?.hint === 'string' &&
      upsertError.hint.includes(BUSINESS_NUMBER_CONFLICT_HINT);

    if (isBusinessConflict) {
      return failure(
        409,
        advertiserErrorCodes.conflict,
        '이미 등록된 사업자등록번호입니다.',
        upsertError,
      );
    }

    return failure(
      500,
      advertiserErrorCodes.updateFailed,
      `광고주 정보를 저장하지 못했습니다: ${upsertError.message}`,
      upsertError,
    );
  }

  return success(
    {
      profileId: upsertedProfile.id,
      isNewProfile: !existingProfile,
    },
    existingProfile ? 200 : 201,
  );
}

// 광고주 프로필 상태를 확인하는 서비스 함수
export async function checkAdvertiserProfileStatus(
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

  const isAdvertiser = userData.role === 'advertiser';

  if (!isAdvertiser) {
    return {
      isAdvertiser: false,
      hasProfile: false,
      needsOnboarding: false,
    };
  }

  // advertiser_profiles 확인
  const { data: profileData, error: profileError } = await supabase
    .from('advertiser_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const hasProfile = !!profileData;

  return {
    isAdvertiser: true,
    hasProfile,
    needsOnboarding: !hasProfile,
  };
}
