import type { Hono } from 'hono';
import {
  failure,
  respond,
  type ErrorResult,
} from '@/backend/http/response';
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from '@/backend/hono/context';
import { SignUpSchema } from '@/features/auth/backend/schema';
import { signUp } from '@/features/auth/backend/service';
import {
  authErrorCodes,
  type AuthServiceError,
} from '@/features/auth/backend/error';

export const registerAuthRoutes = (app: Hono<AppEnv>) => {
  app.post('/auth/signup', async (c) => {
    const body = await c.req.json();
    const parsedBody = SignUpSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          'INVALID_SIGNUP_REQUEST',
          '회원가입 정보가 올바르지 않습니다.',
          parsedBody.error.format(),
        ),
      );
    }

    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await signUp(supabase, parsedBody.data);

    if (!result.ok) {
      const errorResult = result as ErrorResult<AuthServiceError, unknown>;

      if (
        errorResult.error.code === authErrorCodes.createAuthUserFailed ||
        errorResult.error.code === authErrorCodes.createProfileFailed ||
        errorResult.error.code === authErrorCodes.rollbackFailed
      ) {
        logger.error('Signup failed:', errorResult.error.message);
      }

      return respond(c, result);
    }

    logger.info(`User signed up successfully: ${result.data.email}`);

    return respond(c, result);
  });
};
