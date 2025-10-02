export const authErrorCodes = {
  emailAlreadyExists: 'AUTH_EMAIL_ALREADY_EXISTS',
  phoneAlreadyExists: 'AUTH_PHONE_ALREADY_EXISTS',
  createAuthUserFailed: 'AUTH_CREATE_USER_FAILED',
  createProfileFailed: 'AUTH_CREATE_PROFILE_FAILED',
  validationError: 'AUTH_VALIDATION_ERROR',
  rollbackFailed: 'AUTH_ROLLBACK_FAILED',
} as const;

type AuthErrorValue = (typeof authErrorCodes)[keyof typeof authErrorCodes];

export type AuthServiceError = AuthErrorValue;
