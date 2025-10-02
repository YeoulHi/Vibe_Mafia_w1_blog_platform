import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import {
  SignUpResponseSchema,
  UserTableRowSchema,
  type SignUpRequest,
  type SignUpResponse,
  type UserRow,
} from '@/features/auth/backend/schema';
import {
  authErrorCodes,
  type AuthServiceError,
} from '@/features/auth/backend/error';

const USERS_TABLE = 'users';

export const signUp = async (
  client: SupabaseClient,
  request: SignUpRequest,
): Promise<HandlerResult<SignUpResponse, AuthServiceError, unknown>> => {
  const { email, password, name, phone, birthdate, role } = request;

  let authUserId: string | null = null;

  try {
    const { data: authData, error: authError } =
      await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return failure(
          409,
          authErrorCodes.emailAlreadyExists,
          '이미 가입된 이메일입니다.',
        );
      }

      return failure(
        500,
        authErrorCodes.createAuthUserFailed,
        `Auth 사용자 생성에 실패했습니다: ${authError.message}`,
      );
    }

    if (!authData.user) {
      return failure(
        500,
        authErrorCodes.createAuthUserFailed,
        'Auth 사용자 생성 후 사용자 정보를 가져올 수 없습니다.',
      );
    }

    authUserId = authData.user.id;

    const { data: insertedUser, error: insertError } = await client
      .from(USERS_TABLE)
      .insert({
        auth_id: authUserId,
        name,
        phone,
        email,
        birthdate,
        role,
      })
      .select()
      .maybeSingle<UserRow>();

    if (insertError) {
      if (insertError.code === '23505') {
        if (insertError.message.includes('phone')) {
          await rollbackAuthUser(client, authUserId);

          return failure(
            409,
            authErrorCodes.phoneAlreadyExists,
            '이미 등록된 휴대폰 번호입니다.',
          );
        }

        await rollbackAuthUser(client, authUserId);

        return failure(
          409,
          authErrorCodes.emailAlreadyExists,
          '이미 등록된 이메일입니다.',
        );
      }

      await rollbackAuthUser(client, authUserId);

      return failure(
        500,
        authErrorCodes.createProfileFailed,
        `사용자 프로필 생성에 실패했습니다: ${insertError.message}`,
      );
    }

    if (!insertedUser) {
      await rollbackAuthUser(client, authUserId);

      return failure(
        500,
        authErrorCodes.createProfileFailed,
        '사용자 프로필 생성 후 정보를 가져올 수 없습니다.',
      );
    }

    const userParse = UserTableRowSchema.safeParse(insertedUser);

    if (!userParse.success) {
      await rollbackAuthUser(client, authUserId);

      return failure(
        500,
        authErrorCodes.validationError,
        '생성된 사용자 정보의 검증에 실패했습니다.',
        userParse.error.format(),
      );
    }

    const response: SignUpResponse = {
      userId: userParse.data.auth_id,
      email: userParse.data.email,
      name: userParse.data.name,
      role: userParse.data.role,
    };

    const responseParse = SignUpResponseSchema.safeParse(response);

    if (!responseParse.success) {
      return failure(
        500,
        authErrorCodes.validationError,
        '응답 데이터 검증에 실패했습니다.',
        responseParse.error.format(),
      );
    }

    return success(responseParse.data, 201);
  } catch (error) {
    if (authUserId) {
      await rollbackAuthUser(client, authUserId);
    }

    return failure(
      500,
      authErrorCodes.createAuthUserFailed,
      `회원가입 처리 중 예상치 못한 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const rollbackAuthUser = async (
  client: SupabaseClient,
  authUserId: string,
): Promise<void> => {
  try {
    const { error: deleteError } = await client.auth.admin.deleteUser(
      authUserId,
    );

    if (deleteError) {
      console.error(
        `[CRITICAL] Failed to rollback auth user ${authUserId}:`,
        deleteError,
      );
    }
  } catch (rollbackError) {
    console.error(
      `[CRITICAL] Exception during auth user rollback for ${authUserId}:`,
      rollbackError,
    );
  }
};
