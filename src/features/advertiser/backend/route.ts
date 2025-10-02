import type { Context, Hono } from 'hono';
import { failure, respond, success } from '@/backend/http/response';
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from '@/backend/hono/context';
import { advertiserProfileSchema } from './schema';
import { updateAdvertiserProfile, checkAdvertiserProfileStatus } from './service';

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
    .maybeSingle();

  if (userError || !userData) {
    logger.error('User not found:', userError);
    return { error: failure(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.') };
  }

  return { userId: userData.id };
}

export const registerAdvertiserRoutes = (app: Hono<AppEnv>) => {
  // GET /api/advertiser/profile/status - 광고주 프로필 상태 확인
  app.get('/advertiser/profile/status', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const authResult = await authenticateUser(c);
    if ('error' in authResult) {
      return respond(c, authResult.error);
    }

    const { userId } = authResult;

    try {
      const status = await checkAdvertiserProfileStatus(supabase, userId);

      return respond(c, success(status, 200));
    } catch (error) {
      logger.error('Failed to check advertiser profile status:', error);

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

  app.post('/advertiser/profile', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const authResult = await authenticateUser(c);
    if ('error' in authResult) {
      return respond(c, authResult.error);
    }

    const { userId } = authResult;

    let body: unknown;
    try {
      body = await c.req.json();
    } catch (error) {
      logger.error('Failed to parse advertiser profile request body:', error);
      return respond(
        c,
        failure(400, 'INVALID_REQUEST', '요청 본문을 처리할 수 없습니다.', error),
      );
    }

    const parsedBody = advertiserProfileSchema.safeParse(body);
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

    const result = await updateAdvertiserProfile(
      supabase,
      userId,
      parsedBody.data,
    );

    if (!result.ok) {
      logger.error('Failed to update advertiser profile:', result);
      return respond(c, result);
    }

    logger.info(`Advertiser profile saved for user ${userId}`);

    return respond(
      c,
      success(
        {
          message: '광고주 정보가 성공적으로 등록되었습니다.',
          profileId: result.data.profileId,
          isNewProfile: result.data.isNewProfile,
        },
        result.status,
      ),
    );
  });
};
