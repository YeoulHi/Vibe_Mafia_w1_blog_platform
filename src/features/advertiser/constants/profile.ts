export const ADVERTISER_API_ROUTES = {
  profile: '/advertiser/profile',
} as const;

export const ADVERTISER_APP_ROUTES = {
  dashboard: '/dashboard',
} as const;

export const ADVERTISER_ONBOARDING_COPY = {
  title: '광고주 정보 등록',
  subtitle: '체험단 관리를 시작하기 위해 업체 정보를 입력해주세요.',
  successToastTitle: '성공',
  successToastDescription: '광고주 정보가 성공적으로 등록되었습니다.',
  errorToastTitle: '오류',
  defaultErrorMessage: '광고주 정보 등록에 실패했습니다.',
  conflictErrorMessage: '이미 등록된 사업자등록번호입니다.',
  submitLabel: '제출',
  submittingLabel: '제출 중...',
} as const;

export const ADVERTISER_ONBOARDING_IMAGE = {
  hero: 'https://picsum.photos/seed/advertiser-onboarding/960/420',
} as const;
