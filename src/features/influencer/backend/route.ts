import type { Hono } from 'hono';
import type { Context } from 'hono';
import {
  failure,
  respond,
  success,
  type ErrorResult,
} from '@/backend/http/response';
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from '@/backend/hono/context';
import { updateInfluencerProfileSchema } from './schema';
import { updateInfluencerProfile, checkInfluencerProfileStatus } from './service';

// 공통 인증 함수
async function authenticateUser(c: Context<AppEnv>) {
  const supabase = getSupabase(c);
  const logger = getLogger(c);

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: failure(401, 'UNAUTHORIZED', '인증이 필요합니다.') };
  }

  const token = authHeader.substring(7);

  const { data: authData, error: authError } = await supabase.auth.getUser(
    token,
  );

  if (authError || !authData.user) {
    logger.error('Authentication failed:', authError);
    return { error: failure(401, 'UNAUTHORIZED', '유효하지 않은 인증 정보입니다.') };
  }

  const authId = authData.user.id;

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single();

  if (userError || !userData) {
    logger.error('User not found:', userError);
    return { error: failure(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.') };
  }

  return { userId: userData.id };
}

export const registerInfluencerRoutes = (app: Hono<AppEnv>) => {
  // GET /api/influencer/profile/status - 인플루언서 프로필 상태 확인
  app.get('/influencer/profile/status', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const authResult = await authenticateUser(c);
    if ('error' in authResult) {
      return respond(c, authResult.error);
    }

    const { userId } = authResult;

    try {
      const status = await checkInfluencerProfileStatus(supabase, userId);

      return respond(c, success(status, 200));
    } catch (error) {
      logger.error('Failed to check influencer profile status:', error);

      return respond(
        c,
        failure(
          500,
          'INTERNAL_ERROR',
          `프로필 상태 확인에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  });

  // POST /api/influencer/profile - 인플루언서 프로필 업데이트
  app.post('/influencer/profile', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const authResult = await authenticateUser(c);
    if ('error' in authResult) {
      return respond(c, authResult.error);
    }

    const { userId } = authResult;

    // Request body 파싱 및 검증
    const body = await c.req.json();
    const parsedBody = updateInfluencerProfileSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          'INVALID_REQUEST',
          '요청 데이터가 올바르지 않습니다.',
          parsedBody.error.format(),
        ),
      );
    }

    // 서비스 호출
    try {
      const result = await updateInfluencerProfile(
        supabase,
        userId,
        parsedBody.data,
      );

      logger.info(
        `Influencer profile updated successfully for user ${userId}`,
      );

      return respond(
        c,
        success(
          {
            message: '인플루언서 정보가 성공적으로 등록되었습니다.',
            influencerId: result.influencerId,
          },
          200,
        ),
      );
    } catch (error) {
      logger.error('Failed to update influencer profile:', error);

      return respond(
        c,
        failure(
          500,
          'INTERNAL_ERROR',
          `인플루언서 정보 등록에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  });
};
