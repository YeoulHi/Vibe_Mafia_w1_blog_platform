export const advertiserErrorCodes = {
  invalidRequest: 'INVALID_REQUEST',
  forbiddenRole: 'FORBIDDEN_ROLE',
  conflict: 'CONFLICT',
  updateFailed: 'UPDATE_FAILED',
  notFound: 'NOT_FOUND',
} as const;

export type AdvertiserServiceError =
  (typeof advertiserErrorCodes)[keyof typeof advertiserErrorCodes];
