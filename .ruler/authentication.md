---
description: Authentication & Authorization Guidelines
globs: ["src/features/*/backend/route.ts", "src/lib/remote/api-client.ts", "src/app/*/page.tsx"]
---

# Authentication & Authorization Guidelines

인증 및 권한 관리에 대한 일관된 패턴을 정의합니다.

## Must

- Backend API는 반드시 Bearer 토큰 인증 사용
- 공통 인증 함수를 만들어 재사용
- `auth_id`로 `users` 테이블의 실제 `id` 조회 후 사용
- Role 체크 시 데이터베이스 값과 일치하는 **소문자** 사용 (`'advertiser'`, `'influencer'`)
- Frontend는 Axios interceptor로 자동 토큰 추가

## Backend Authentication Pattern

### 공통 인증 함수 (재사용 필수)

```typescript
// src/features/[feature]/backend/route.ts
import type { Context } from 'hono';
import { getSupabase, getLogger, type AppEnv } from '@/backend/hono/context';
import { failure } from '@/backend/http/response';

async function authenticateUser(c: Context<AppEnv>) {
  const supabase = getSupabase(c);
  const logger = getLogger(c);

  // 1. Authorization 헤더 확인
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: failure(401, 'UNAUTHORIZED', '인증이 필요합니다.') };
  }

  const token = authHeader.substring(7);

  // 2. Supabase Auth로 사용자 확인
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    logger.error('Authentication failed:', authError);
    return { error: failure(401, 'UNAUTHORIZED', '유효하지 않은 인증 정보입니다.') };
  }

  const authId = authData.user.id;

  // 3. users 테이블에서 실제 user_id 조회
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

// 사용 예시
export const registerSomeRoutes = (app: Hono<AppEnv>) => {
  app.post('/some/route', async (c) => {
    const authResult = await authenticateUser(c);
    if ('error' in authResult) {
      return respond(c, authResult.error);
    }

    const { userId } = authResult;
    // userId 사용한 로직 진행
  });
};
```

### Role 기반 권한 확인

```typescript
// src/features/[feature]/backend/service.ts
export async function checkUserRole(
  supabase: SupabaseClient,
  userId: number
) {
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  // ⚠️ 중요: 소문자 사용 (데이터베이스 CHECK constraint와 일치)
  const isInfluencer = userData.role === 'influencer';
  const isAdvertiser = userData.role === 'advertiser';

  return { role: userData.role, isInfluencer, isAdvertiser };
}
```

## Frontend Authentication Pattern

### API Client Interceptor (자동 토큰 추가)

```typescript
// src/lib/remote/api-client.ts
import axios from "axios";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: 자동으로 Authorization 헤더 추가
apiClient.interceptors.request.use(async (config) => {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

export { apiClient };
```

### 보호된 페이지 (Protected Page)

```typescript
// src/app/(protected)/some-page/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

export default function ProtectedPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?redirectedFrom=/some-page");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return null; // 또는 로딩 스피너
  }

  return (
    <div>
      {/* 인증된 사용자만 볼 수 있는 컨텐츠 */}
    </div>
  );
}
```

## Role-Based Conditional Rendering

### 조건부 UI 표시

```typescript
// src/app/(protected)/dashboard/page.tsx
"use client";

import { useUserRole } from "@/features/auth/hooks/useUserRole";

export default function Dashboard() {
  const { role, isInfluencer, isAdvertiser } = useUserRole();

  return (
    <div>
      {isInfluencer && (
        <div>인플루언서 전용 컨텐츠</div>
      )}

      {isAdvertiser && (
        <div>광고주 전용 컨텐츠</div>
      )}
    </div>
  );
}
```

## 주의사항

### 1. 대소문자 일관성
```typescript
// ❌ 잘못된 예
const isInfluencer = userData.role === 'INFLUENCER'; // 데이터베이스는 소문자

// ✅ 올바른 예
const isInfluencer = userData.role === 'influencer';
```

### 2. auth_id vs user_id
- `auth_id`: Supabase Auth의 UUID (auth.users.id)
- `user_id`: 애플리케이션 DB의 숫자 ID (public.users.id)
- **반드시 auth_id로 user_id를 조회한 후 사용**

### 3. 에러 처리
- 인증 실패 시 명확한 에러 코드 반환 (401, 404 등)
- 사용자 친화적인 한글 메시지 제공
- Logger를 사용하여 서버 로그 기록

## 테스트 체크리스트

Backend:
- [ ] 토큰 없이 요청 시 401 반환
- [ ] 유효하지 않은 토큰 시 401 반환
- [ ] 존재하지 않는 사용자 시 404 반환
- [ ] 올바른 토큰으로 userId 정상 조회

Frontend:
- [ ] 로그인 후 자동으로 토큰 추가
- [ ] 토큰 만료 시 로그인 페이지로 리다이렉트
- [ ] 보호된 페이지 접근 제어 정상 작동
