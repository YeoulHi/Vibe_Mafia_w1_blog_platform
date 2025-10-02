# Task 002: 인플루언서 정보 등록 - 구현 완료 로그

## 📋 작업 개요

**작업 기간**: 2025-10-02
**작업 내용**: 인플루언서 계정 온보딩 - SNS 채널 정보 등록 기능 구현
**관련 문서**: `docs/002/spec.md`, `docs/002/plan.md`

---

## ✅ 구현 완료 사항

### 1. Backend 구현

#### 1.1 스키마 정의 (`src/features/influencer/backend/schema.ts`)
```typescript
// 채널 타입 정의
export const channelTypeSchema = z.enum([
  'NAVER_BLOG',
  'YOUTUBE',
  'INSTAGRAM',
  'THREADS',
]);

// 단일 채널 스키마
export const channelSchema = z.object({
  channel_type: channelTypeSchema,
  channel_name: z.string().min(1, '채널 이름을 입력해주세요'),
  channel_url: z.string().url('올바른 URL 형식을 입력해주세요'),
  follower_count: z.number().int().min(0, '팔로워 수는 0 이상이어야 합니다'),
});

// 인플루언서 프로필 업데이트 요청 스키마
export const updateInfluencerProfileSchema = z.object({
  channels: z.array(channelSchema).min(0),
});
```

#### 1.2 서비스 로직 (`src/features/influencer/backend/service.ts`)

**주요 기능**:
- `checkInfluencerProfileStatus`: 사용자 role 확인 및 프로필 존재 여부 체크
- `updateInfluencerProfile`: 인플루언서 프로필 및 채널 정보 upsert

**핵심 구현**:
```typescript
export async function updateInfluencerProfile(
  supabase: SupabaseClient,
  userId: number,
  data: UpdateInfluencerProfileRequest
) {
  // 1. influencer_profiles 생성 또는 조회
  // 2. 기존 채널 정보 삭제
  // 3. 새로운 채널 정보 삽입
}
```

#### 1.3 API 라우트 (`src/features/influencer/backend/route.ts`)

**엔드포인트**:
- `GET /api/influencer/profile/status` - 인플루언서 프로필 상태 확인
- `POST /api/influencer/profile` - 인플루언서 프로필 업데이트

**인증 방식**:
- Bearer 토큰 방식 (Authorization 헤더)
- Supabase Auth를 통한 사용자 확인
- `auth_id`로 `users` 테이블에서 `user_id` 조회

#### 1.4 Hono 앱 등록 (`src/backend/hono/app.ts`)
```typescript
import { registerInfluencerRoutes } from '@/features/influencer/backend/route';

registerAuthRoutes(app);
registerInfluencerRoutes(app);  // 추가
```

---

### 2. Frontend 구현

#### 2.1 폼 컴포넌트 (`src/features/influencer/components/InfluencerOnboardingForm.tsx`)

**주요 기능**:
- `react-hook-form`의 `useFieldArray` 사용하여 동적 채널 추가/삭제
- Zod 스키마 검증
- shadcn-ui 컴포넌트 활용

**핵심 구현**:
```typescript
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "channels",
});

const handleAddChannel = () => {
  append({
    channel_type: "NAVER_BLOG",
    channel_name: "",
    channel_url: "",
    follower_count: 0,
  });
};
```

**UI 구성**:
- 채널 타입 선택 (Select)
- 채널 이름 입력
- 채널 URL 입력
- 팔로워 수 입력
- 채널 추가/삭제 버튼

#### 2.2 React Query 훅

**`useUpdateInfluencerProfile.ts`**:
```typescript
export const useUpdateInfluencerProfile = () => {
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateInfluencerProfileRequest) => {
      const response = await apiClient.post("/influencer/profile", data);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "성공", description: "인플루언서 정보가 성공적으로 등록되었습니다." });
      router.push("/dashboard");
    },
    onError: (error) => {
      const message = extractApiErrorMessage(error, "인플루언서 정보 등록에 실패했습니다.");
      toast({ title: "오류", description: message, variant: "destructive" });
    },
  });
};
```

**`useInfluencerProfileStatus.ts`**:
```typescript
export const useInfluencerProfileStatus = () => {
  const { isAuthenticated } = useCurrentUser();

  return useQuery<InfluencerProfileStatus>({
    queryKey: ["influencer", "profile", "status"],
    queryFn: async () => {
      const response = await apiClient.get<InfluencerProfileStatus>("/influencer/profile/status");
      return response.data ?? defaultStatus;
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
    placeholderData: defaultStatus,
  });
};
```

#### 2.3 페이지 구현 (`src/app/(protected)/onboarding/influencer/page.tsx`)

**보호된 라우트**:
- `(protected)` 그룹 내 위치
- 인증된 사용자만 접근 가능

```typescript
export default function InfluencerOnboardingPage({ params }: Props) {
  void params;
  const mutation = useUpdateInfluencerProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">인플루언서 정보 등록</h1>
        <p className="text-slate-500">체험단에 지원하기 위해 SNS 채널 정보를 등록해주세요.</p>
      </header>
      <div className="rounded-xl border border-slate-200 p-6">
        <InfluencerOnboardingForm
          onSubmit={(data) => mutation.mutate(data)}
          isLoading={mutation.isPending}
        />
      </div>
    </div>
  );
}
```

---

### 3. 자동 리다이렉트 기능

#### 3.1 로그인 후 리다이렉트 (`src/app/login/page.tsx`)

**로직**:
1. 로그인 성공 후 인플루언서 프로필 상태 확인
2. 인플루언서이고 프로필이 없으면 `/onboarding/influencer`로 리다이렉트
3. 그 외에는 기본 경로(`/dashboard`)로 이동

```typescript
if (nextAction === "success") {
  await refresh();

  try {
    const statusResponse = await apiClient.get<InfluencerProfileStatus>("/influencer/profile/status");
    const { isInfluencer, needsOnboarding } = statusResponse.data;

    if (isInfluencer && needsOnboarding) {
      router.replace("/onboarding/influencer");
      return;
    }
  } catch (error) {
    console.error("Failed to check influencer status:", error);
  }

  const redirectedFrom = searchParams.get("redirectedFrom") ?? "/dashboard";
  router.replace(redirectedFrom);
}
```

#### 3.2 대시보드 버튼 (`src/app/(protected)/dashboard/page.tsx`)

**표시 조건**:
- 인플루언서 계정 (`isInfluencer === true`)
- 프로필 미등록 상태 (`hasProfile === false`)

```typescript
{profileStatus?.isInfluencer && !profileStatus?.hasProfile && (
  <Button asChild>
    <Link href="/onboarding/influencer">인플루언서 정보 등록</Link>
  </Button>
)}
```

---

### 4. API 클라이언트 개선 (`src/lib/remote/api-client.ts`)

**자동 인증 토큰 추가**:
```typescript
apiClient.interceptors.request.use(async (config) => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});
```

---

## 🐛 해결한 이슈

### 이슈 1: React Query undefined 에러

**문제**:
```
Query data cannot be undefined. Please make sure to return a value other than undefined from your query function.
```

**원인**:
- 인증되지 않은 사용자의 경우 API 호출이 실패하여 `undefined` 반환
- React Query는 `undefined`를 허용하지 않음

**해결**:
```typescript
const defaultStatus: InfluencerProfileStatus = {
  isInfluencer: false,
  hasProfile: false,
  needsOnboarding: false,
};

return useQuery<InfluencerProfileStatus>({
  queryKey: ["influencer", "profile", "status"],
  queryFn: async () => {
    if (!isAuthenticated) {
      return defaultStatus;
    }
    try {
      const response = await apiClient.get<InfluencerProfileStatus>("/influencer/profile/status");
      return response.data ?? defaultStatus;
    } catch (error) {
      console.error("Failed to fetch influencer profile status:", error);
      return defaultStatus;
    }
  },
  enabled: isAuthenticated,
  retry: false,
  staleTime: 1000 * 60 * 5,
  placeholderData: defaultStatus,
});
```

### 이슈 2: Role 체크 대소문자 불일치

**문제**:
- 데이터베이스: `role VARCHAR(20) NOT NULL CHECK (role IN ('advertiser', 'influencer'))` (소문자)
- 백엔드 코드: `userData.role === 'INFLUENCER'` (대문자)

**원인**:
- SQL CHECK constraint에서 소문자만 허용
- 백엔드에서 대문자로 비교

**해결**:
```typescript
// Before
const isInfluencer = userData.role === 'INFLUENCER';

// After
const isInfluencer = userData.role === 'influencer';
```

### 이슈 3: API 응답 구조 불일치

**문제**:
- 프론트엔드: `response.data.data` 접근
- 백엔드: `respond()` 함수가 성공 시 데이터를 직접 반환

**해결**:
```typescript
// Before
const response = await apiClient.get<{ data: InfluencerProfileStatus }>("/influencer/profile/status");
return response.data.data;

// After
const response = await apiClient.get<InfluencerProfileStatus>("/influencer/profile/status");
return response.data;
```

---

## 📁 파일 구조

```
src/
├── features/influencer/
│   ├── backend/
│   │   ├── route.ts         # Hono 라우터 (GET, POST 엔드포인트)
│   │   ├── service.ts       # 비즈니스 로직
│   │   └── schema.ts        # Zod 검증 스키마
│   ├── components/
│   │   └── InfluencerOnboardingForm.tsx
│   └── hooks/
│       ├── useUpdateInfluencerProfile.ts
│       └── useInfluencerProfileStatus.ts
├── app/
│   ├── (protected)/
│   │   ├── dashboard/page.tsx         # 버튼 추가
│   │   └── onboarding/influencer/page.tsx
│   └── login/page.tsx                 # 리다이렉트 로직 추가
└── lib/
    └── remote/api-client.ts           # 인터셉터 추가
```

---

## 🧪 테스트 결과

### Build & Type Check
```bash
✓ Compiled successfully
✓ Checking validity of types
✓ No ESLint warnings or errors
```

### 수동 테스트
- ✅ 인플루언서 계정 로그인 시 온보딩 페이지로 자동 리다이렉트
- ✅ 대시보드에서 "인플루언서 정보 등록" 버튼 표시
- ✅ 채널 추가/삭제 기능 정상 작동
- ✅ 폼 검증 (URL, 팔로워 수) 정상 작동
- ✅ 제출 성공 시 대시보드로 이동 및 토스트 메시지 표시

---

## 🔄 워크플로우

### 신규 인플루언서 회원가입
1. `/signup` 페이지에서 역할 "인플루언서" 선택
2. 회원가입 완료 → `users` 테이블에 `role = 'influencer'` 저장
3. 로그인 → `/onboarding/influencer`로 자동 리다이렉트
4. SNS 채널 정보 입력 및 제출
5. `/dashboard`로 이동

### 기존 인플루언서 (프로필 미등록)
1. 로그인 → `/onboarding/influencer`로 자동 리다이렉트
2. 또는 대시보드 우상단 "인플루언서 정보 등록" 버튼 클릭
3. SNS 채널 정보 입력 및 제출
4. `/dashboard`로 이동

### 기존 인플루언서 (프로필 등록 완료)
1. 로그인 → `/dashboard`로 이동
2. 버튼 미표시 (이미 프로필 등록됨)

---

## 📊 데이터베이스 관계

```
users (role = 'influencer')
  ↓ (1:1)
influencer_profiles
  ↓ (1:N)
influencer_channels
```

**Upsert 로직**:
1. `influencer_profiles` 레코드 존재 여부 확인
2. 없으면 생성, 있으면 재사용
3. 기존 `influencer_channels` 삭제
4. 새로운 채널 정보 삽입

---

## 🚀 배포 준비

### 환경 변수 확인
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Migration 적용
- ✅ `0001_initial_schema_and_data.sql` 적용 완료
- ✅ `influencer_profiles` 테이블 생성
- ✅ `influencer_channels` 테이블 생성

### 프로덕션 체크리스트
- ✅ TypeScript 타입 검사 통과
- ✅ ESLint 검사 통과
- ✅ 프로덕션 빌드 성공
- ✅ 모든 API 엔드포인트 정상 작동
- ✅ 에러 처리 및 사용자 피드백 구현

---

## 📝 개선 사항 (추후 고려)

### 성능 최적화
- [ ] 채널 변경 감지 후 변경된 항목만 update/insert/delete (현재: 전체 삭제 후 재생성)
- [ ] React Query 캐시 전략 개선
- [ ] 이미지 업로드 기능 추가 (프로필 사진)

### 사용자 경험
- [ ] 채널 URL 자동 검증 강화 (도메인별 패턴 매칭)
- [ ] 채널 순서 변경 기능 (드래그 앤 드롭)
- [ ] 채널 미리보기 기능

### 보안
- [ ] Rate limiting 추가
- [ ] CSRF 토큰 검증
- [ ] Input sanitization 강화

---

## 🔗 관련 문서
- [Task 002 Spec](../002/spec.md)
- [Task 002 Plan](../002/plan.md)
- [Task 002 Context](./Task_002_Context.md)
- [Database Schema](../database.md)
- [User Flow](../userflow.md)

---

## 👥 작업자
- Claude (AI Assistant)
- 작업 완료일: 2025-10-02
