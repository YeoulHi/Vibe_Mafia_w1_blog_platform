# Task 002: 인플루언서 정보 등록 - 추가 컨텍스트

## 기존 Task 001과의 일관성 유지

### 1. Backend 구조 일관성

#### 1.1 디렉토리 구조
Task 001 (Auth)과 동일한 패턴 적용:

```
src/features/influencer/
├── backend/
│   ├── route.ts        # Hono 라우터 (POST /api/influencer/profile)
│   ├── service.ts      # Supabase 비즈니스 로직
│   ├── schema.ts       # Zod 검증 스키마
│   └── error.ts        # 에러 코드 정의
├── components/
│   └── InfluencerOnboardingForm.tsx
├── hooks/
│   └── useUpdateInfluencerProfile.ts
└── lib/
    └── dto.ts          # 스키마 재노출
```

#### 1.2 Hono App 등록
**Task 001 참고**: `src/backend/hono/app.ts`
```typescript
import { registerInfluencerRoutes } from '@/features/influencer/backend/route';

// app.ts 내부
registerAuthRoutes(app);
registerInfluencerRoutes(app);  // 추가
```

#### 1.3 에러 처리 패턴
**Task 001 패턴 준수**:
```typescript
// src/features/influencer/backend/error.ts
export const influencerErrorCodes = {
  invalidChannelUrl: 'INVALID_CHANNEL_URL',
  profileCreationFailed: 'PROFILE_CREATION_FAILED',
  channelCreationFailed: 'CHANNEL_CREATION_FAILED',
} as const;

export type InfluencerServiceError =
  (typeof influencerErrorCodes)[keyof typeof influencerErrorCodes];
```

---

### 2. Frontend 구조 일관성

#### 2.1 React Hook Form 패턴
**Task 001 SignUpForm 참고**:
- `mode: "onChange"` 필수 (실시간 검증)
- `zodResolver` 사용
- shadcn-ui 컴포넌트 활용

#### 2.2 React Query Mutation 패턴
**Task 001 useSignUpMutation 참고**:
```typescript
// src/features/influencer/hooks/useUpdateInfluencerProfile.ts
export const useUpdateInfluencerProfile = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: UpdateInfluencerProfileRequest) => {
      const response = await apiClient.post<UpdateInfluencerProfileResponse>(
        "/influencer/profile",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "프로필 등록 완료",
        description: "인플루언서 정보가 등록되었습니다.",
      });
      router.push("/dashboard");
    },
    onError: (error: unknown) => {
      const message = extractApiErrorMessage(
        error,
        "프로필 등록에 실패했습니다."
      );
      toast({
        title: "등록 실패",
        description: message,
        variant: "destructive",
      });
    },
  });
};
```

---

### 3. 인증 및 권한 처리

#### 3.1 보호된 라우트 (Protected Route)
**새로운 요구사항**: `/onboarding/influencer` 페이지는 인증된 사용자만 접근

**구현 방법**:
```typescript
// src/app/(protected)/onboarding/influencer/page.tsx
"use client";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InfluencerOnboardingPage() {
  const { isAuthenticated, user } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?redirectedFrom=/onboarding/influencer");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <InfluencerOnboardingForm />;
}
```

#### 3.2 Backend 인증 확인
**Task 001과 차이점**: service에서 `auth_id` 추출 필요

```typescript
// src/features/influencer/backend/route.ts
export const registerInfluencerRoutes = (app: Hono<AppEnv>) => {
  app.post('/influencer/profile', async (c) => {
    const supabase = getSupabase(c);

    // 인증된 사용자 확인 (Task 001과 다른 점)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond(c, failure(401, 'UNAUTHORIZED', '인증이 필요합니다.'));
    }

    // user.id를 사용하여 public.users의 auth_id와 매칭
    const body = await c.req.json();
    const result = await updateInfluencerProfile(supabase, user.id, body);

    return respond(c, result);
  });
};
```

---

### 4. 동적 폼 처리 (useFieldArray)

#### 4.1 스키마 정의
```typescript
// src/features/influencer/backend/schema.ts
import { z } from 'zod';

export const ChannelSchema = z.object({
  channel_type: z.enum(['NAVER_BLOG', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK'], {
    required_error: '채널 유형을 선택해주세요.',
  }),
  channel_name: z.string().min(1, '채널 이름을 입력해주세요.'),
  channel_url: z.string().url('유효한 URL을 입력해주세요.'),
  follower_count: z.number().int().min(0, '팔로워 수는 0 이상이어야 합니다.').default(0),
});

export const UpdateInfluencerProfileSchema = z.object({
  channels: z.array(ChannelSchema).min(0, '최소 0개 이상의 채널을 등록할 수 있습니다.'),
});

export type ChannelInput = z.infer<typeof ChannelSchema>;
export type UpdateInfluencerProfileRequest = z.infer<typeof UpdateInfluencerProfileSchema>;
```

#### 4.2 useFieldArray 사용
```typescript
// src/features/influencer/components/InfluencerOnboardingForm.tsx
import { useFieldArray } from "react-hook-form";

const form = useForm<UpdateInfluencerProfileRequest>({
  resolver: zodResolver(UpdateInfluencerProfileSchema),
  mode: "onChange",
  defaultValues: {
    channels: [],
  },
});

const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "channels",
});

// 채널 추가
const addChannel = () => {
  append({
    channel_type: "NAVER_BLOG",
    channel_name: "",
    channel_url: "",
    follower_count: 0,
  });
};

// 채널 삭제
const removeChannel = (index: number) => {
  remove(index);
};
```

---

### 5. 데이터베이스 처리 (Upsert 로직)

#### 5.1 Service 구현
```typescript
// src/features/influencer/backend/service.ts
export const updateInfluencerProfile = async (
  client: SupabaseClient,
  authId: string,
  request: UpdateInfluencerProfileRequest,
): Promise<HandlerResult<UpdateInfluencerProfileResponse, InfluencerServiceError, unknown>> => {
  try {
    // 1. auth_id로 user_id 조회
    const { data: user, error: userError } = await client
      .from('users')
      .select('id')
      .eq('auth_id', authId)
      .single();

    if (userError || !user) {
      return failure(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
    }

    // 2. influencer_profile upsert (있으면 업데이트, 없으면 생성)
    const { data: profile, error: profileError } = await client
      .from('influencer_profiles')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' })
      .select()
      .single();

    if (profileError || !profile) {
      return failure(500, 'PROFILE_CREATION_FAILED', '프로필 생성에 실패했습니다.');
    }

    // 3. 기존 채널 삭제 후 재생성 (간단한 방식)
    await client
      .from('influencer_channels')
      .delete()
      .eq('influencer_id', profile.id);

    // 4. 새 채널 삽입
    if (request.channels.length > 0) {
      const channelsToInsert = request.channels.map(ch => ({
        influencer_id: profile.id,
        channel_type: ch.channel_type,
        channel_name: ch.channel_name,
        channel_url: ch.channel_url,
        follower_count: ch.follower_count,
      }));

      const { error: channelError } = await client
        .from('influencer_channels')
        .insert(channelsToInsert);

      if (channelError) {
        return failure(500, 'CHANNEL_CREATION_FAILED', '채널 등록에 실패했습니다.');
      }
    }

    return success({ profileId: profile.id }, 200);
  } catch (error) {
    return failure(500, 'UNEXPECTED_ERROR', '예상치 못한 오류가 발생했습니다.');
  }
};
```

---

### 6. Task 001과의 차이점 정리

| 항목 | Task 001 (Auth) | Task 002 (Influencer) |
|------|-----------------|----------------------|
| **인증 처리** | 회원가입/로그인 (인증 생성) | 기존 인증 확인 필요 |
| **데이터 저장** | `auth.users` + `public.users` | `influencer_profiles` + `influencer_channels` |
| **폼 구조** | 단일 필드 | 동적 배열 (`useFieldArray`) |
| **Upsert 로직** | 불필요 (항상 신규) | 필수 (업데이트 가능) |
| **권한 확인** | 불필요 | 필수 (로그인 사용자만) |

---

### 7. 주의사항 및 베스트 프랙티스

#### 7.1 URL 검증
- Zod의 `.url()` 사용으로 기본 검증
- 추가로 도메인별 검증 가능 (예: 네이버 블로그는 `blog.naver.com` 포함 여부)

#### 7.2 에러 핸들링
- Task 001과 동일한 `respond()` 패턴 사용
- 사용자 친화적인 한글 메시지 제공

#### 7.3 성능 최적화
- 채널 삭제 후 재생성 방식은 간단하지만, 채널이 많을 경우 비효율적
- 프로덕션에서는 변경된 채널만 update/insert/delete 하는 로직 고려

#### 7.4 접근성
- `useFieldArray`의 각 필드에 고유 `key` 사용 (React 최적화)
- 삭제 버튼에 aria-label 추가

---

### 8. 테스트 시나리오

#### Backend Unit Test
- [ ] 인증되지 않은 사용자 요청 시 401 반환
- [ ] 유효하지 않은 URL 입력 시 400 반환
- [ ] 채널 0개로 제출 시 정상 처리
- [ ] 기존 프로필 업데이트 시 정상 처리

#### Frontend QA
- [ ] 채널 추가 버튼 클릭 시 필드 추가
- [ ] 채널 삭제 버튼 클릭 시 필드 제거
- [ ] 유효하지 않은 URL 입력 시 에러 메시지 표시
- [ ] 제출 성공 시 대시보드로 이동

---

### 9. Migration 확인사항

Task 001에서 이미 테이블 생성 완료:
- ✅ `influencer_profiles` (user_id UNIQUE)
- ✅ `influencer_channels` (influencer_id FK)

추가 migration 불필요.

---

### 10. 다음 단계 (Task 003)

광고주 정보 등록 기능도 유사한 패턴으로 구현:
- `advertiser_profiles` 테이블 활용
- 업체 정보 입력 (company_name, business_number 등)
- Task 002의 upsert 로직 재사용
