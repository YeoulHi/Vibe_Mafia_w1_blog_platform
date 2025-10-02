# Task 003: 광고주 정보 등록 기능 구현 로그

## 📋 작업 개요
- **작업 일자**: 2025-10-02
- **기능 이름**: 광고주 정보 등록 (MVP)
- **참조 문서**: `docs/003/plan.md`, `docs/003/spec.md`, `docs/database.md`, `docs/goal.md`, `docs/userflow.md`

---

## ✅ 구현 결과 요약
1. **백엔드**
   - `advertiserProfileSchema`로 입력 값 검증 추가 (`src/features/advertiser/backend/schema.ts`).
   - `updateAdvertiserProfile` 서비스로 역할 검증 및 `advertiser_profiles` upsert 처리 (`src/features/advertiser/backend/service.ts`).
   - Hono 라우트 `POST /api/advertiser/profile` 구현 및 공통 인증 적용 (`src/features/advertiser/backend/route.ts`).
   - Hono 앱에 광고주 라우트 등록 (`src/backend/hono/app.ts`).
2. **프론트엔드**
   - 광고주 온보딩 폼 컴포넌트 작성 (`src/features/advertiser/components/AdvertiserOnboardingForm.tsx`).
   - React Query mutation 훅 구현 및 토스트/리다이렉트 처리 (`src/features/advertiser/hooks/useUpdateAdvertiserProfile.ts`).
   - 온보딩 페이지 생성 및 폼 연동 (`src/app/(protected)/onboarding/advertiser/page.tsx`).
   - 상수/복붙 문자열을 전용 모듈로 분리 (`src/features/advertiser/constants/profile.ts`, `src/features/advertiser/lib/dto.ts`).

---

## 🔍 구현 상세
### 1. 서버 사이드
- **스키마 검증**: 전화번호와 사업자등록번호 형식을 Zod 정규식으로 검증.
- **서비스 로직**: 사용자 역할이 광고주인지 확인 후, 기존 프로필 여부를 체크하고 upsert 수행. 사업자등록번호 중복 시 409 콘플릭트 반환.
- **라우팅**: Bearer 토큰 기반 인증 재사용. 입력 파싱 실패/검증 실패에 대한 400 응답 정규화. 서비스 결과를 `respond` 헬퍼로 일관 반환.

### 2. 클라이언트 사이드
- **폼 UX**: `react-hook-form` + `zodResolver`로 실시간 검증, 유효성 전까지 제출 버튼 비활성화. placeholder/label 상수화.
- **Mutation**: `apiClient`를 사용해 `/advertiser/profile` 호출, 성공 시 토스트 + 대시보드 이동, 실패 시 `extractApiErrorMessage` 기반 에러 토스트.
- **페이지 컴포지션**: Hero 배너에 `picsum.photos` 이미지를 사용하고, 상수화된 카피로 헤더 구성.

---

## 🧪 검증 내역
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

모두 정상 통과.

---

## 📂 주요 변경 파일
- `src/features/advertiser/backend/schema.ts`
- `src/features/advertiser/backend/service.ts`
- `src/features/advertiser/backend/route.ts`
- `src/backend/hono/app.ts`
- `src/features/advertiser/components/AdvertiserOnboardingForm.tsx`
- `src/features/advertiser/hooks/useUpdateAdvertiserProfile.ts`
- `src/app/(protected)/onboarding/advertiser/page.tsx`
- `src/features/advertiser/constants/profile.ts`
- `src/features/advertiser/lib/dto.ts`

---

## 🚀 추후 개선 아이디어
1. 광고주 프로필 조회 API를 추가하여 기존 데이터 사전 로딩.
2. 전화번호/주소 입력을 위한 UI 마스킹 및 자동 완성 도입.
3. 광고주 대시보드 접근 가드를 프로필 유무에 따라 자동 리다이렉트하도록 개선.

