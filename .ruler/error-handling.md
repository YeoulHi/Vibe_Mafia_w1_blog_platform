---
description: Error Handling & Logging Guidelines
globs: ["src/features/*/backend/**/*.ts", "src/features/*/hooks/**/*.ts"]
---

# Error Handling & Logging Guidelines

일관된 에러 처리 및 로깅 패턴을 정의합니다.

## Must

- Backend는 항상 `respond()` 함수로 응답 반환
- 에러 코드는 각 feature별 `error.ts`에 정의
- Frontend는 `extractApiErrorMessage()` 사용
- 사용자에게 친화적인 한글 메시지 제공
- 프로덕션 코드에 console.log 남기지 않기

## Backend Error Handling

### 1. 에러 코드 정의

```typescript
// src/features/[feature]/backend/error.ts
export const featureErrorCodes = {
  invalidRequest: 'INVALID_REQUEST',
  notFound: 'NOT_FOUND',
  creationFailed: 'CREATION_FAILED',
  updateFailed: 'UPDATE_FAILED',
  deleteFailed: 'DELETE_FAILED',
} as const;

export type FeatureServiceError =
  (typeof featureErrorCodes)[keyof typeof featureErrorCodes];
```

### 2. Service Layer 에러 처리

```typescript
// src/features/[feature]/backend/service.ts
import { failure, success, type HandlerResult } from '@/backend/http/response';
import { featureErrorCodes, type FeatureServiceError } from './error';

export const someService = async (
  client: SupabaseClient,
  request: SomeRequest,
): Promise<HandlerResult<SomeResponse, FeatureServiceError, unknown>> => {
  try {
    // 비즈니스 로직
    const { data, error } = await client.from('table').select();

    if (error) {
      return failure(
        500,
        featureErrorCodes.creationFailed,
        '데이터 생성에 실패했습니다.',
        error // 상세 에러 정보 (optional)
      );
    }

    if (!data) {
      return failure(
        404,
        featureErrorCodes.notFound,
        '데이터를 찾을 수 없습니다.'
      );
    }

    return success(data, 200);
  } catch (error) {
    return failure(
      500,
      'UNEXPECTED_ERROR',
      `예상치 못한 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
```

### 3. Route Layer 에러 처리

```typescript
// src/features/[feature]/backend/route.ts
import { respond } from '@/backend/http/response';
import { getLogger } from '@/backend/hono/context';

export const registerSomeRoutes = (app: Hono<AppEnv>) => {
  app.post('/some/route', async (c) => {
    const logger = getLogger(c);

    // 요청 검증
    const body = await c.req.json();
    const parsedBody = SomeSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          'INVALID_REQUEST',
          '요청 데이터가 올바르지 않습니다.',
          parsedBody.error.format() // Zod 에러 상세 정보
        ),
      );
    }

    // 서비스 호출
    const result = await someService(getSupabase(c), parsedBody.data);

    // 에러 로깅 (필요시)
    if (!result.ok) {
      logger.error('Service failed:', result.error);
    }

    return respond(c, result);
  });
};
```

## Frontend Error Handling

### 1. React Query Mutation 에러 처리

```typescript
// src/features/[feature]/hooks/useSomeMutation.ts
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { useToast } from "@/hooks/use-toast";

export const useSomeMutation = () => {
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SomeRequest) => {
      const response = await apiClient.post("/some/route", data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "작업이 성공적으로 완료되었습니다.",
      });
      router.push("/success-page");
    },
    onError: (error) => {
      const message = extractApiErrorMessage(
        error,
        "작업에 실패했습니다." // 기본 메시지
      );
      toast({
        title: "오류",
        description: message,
        variant: "destructive",
      });
    },
  });
};
```

### 2. React Query Query 에러 처리

```typescript
// src/features/[feature]/hooks/useSomeQuery.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";

const defaultValue: SomeData = {
  // 기본값 정의
};

export const useSomeQuery = () => {
  return useQuery<SomeData>({
    queryKey: ["some", "data"],
    queryFn: async () => {
      try {
        const response = await apiClient.get<SomeData>("/some/route");
        return response.data ?? defaultValue;
      } catch (error) {
        console.error("Failed to fetch data:", error);
        return defaultValue; // undefined 반환 방지
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    placeholderData: defaultValue, // undefined 방지
  });
};
```

### 3. 에러 메시지 추출

```typescript
// src/lib/remote/api-client.ts (이미 구현됨)
import { isAxiosError } from "axios";

type ErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

export const extractApiErrorMessage = (
  error: unknown,
  fallbackMessage = "요청에 실패했습니다."
) => {
  if (isAxiosError(error)) {
    const payload = error.response?.data as ErrorPayload | undefined;

    // Backend의 failure() 응답 구조
    if (typeof payload?.error?.message === "string") {
      return payload.error.message;
    }

    if (typeof payload?.message === "string") {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};
```

## Logging Best Practices

### 1. Backend 로깅

```typescript
// src/features/[feature]/backend/route.ts
import { getLogger } from '@/backend/hono/context';

export const registerSomeRoutes = (app: Hono<AppEnv>) => {
  app.post('/some/route', async (c) => {
    const logger = getLogger(c);

    // ✅ 중요한 이벤트 로깅
    logger.info(`User ${userId} performed action`);

    try {
      // 비즈니스 로직
    } catch (error) {
      // ✅ 에러 로깅
      logger.error('Failed to perform action:', error);
      throw error;
    }
  });
};
```

### 2. Frontend 로깅 (개발 전용)

```typescript
// ✅ 개발 환경에서만 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// ❌ 프로덕션 코드에 console.log 남기지 않기
console.log('Profile Status:', profileStatus); // 제거 필요
```

### 3. 디버깅 로그 제거

```typescript
// 개발 중 디버깅
console.log('[checkInfluencerProfileStatus] userId:', userId);
console.log('[checkInfluencerProfileStatus] userData:', userData);

// ⚠️ 커밋 전 반드시 제거
```

## 에러 응답 구조

### Backend 응답 형식

```typescript
// 성공 응답
{
  "data": { ... }
}

// 에러 응답
{
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적인 메시지",
    "details": { ... } // optional
  }
}
```

### Frontend 에러 처리 플로우

```
API 요청 실패
  ↓
extractApiErrorMessage()로 메시지 추출
  ↓
Toast로 사용자에게 피드백
  ↓
필요시 에러 상태 저장 또는 리다이렉트
```

## HTTP Status Code 가이드

### 성공 (2xx)
- `200 OK`: 조회, 업데이트 성공
- `201 Created`: 생성 성공

### 클라이언트 에러 (4xx)
- `400 Bad Request`: 잘못된 요청 (Zod 검증 실패 등)
- `401 Unauthorized`: 인증 필요
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 중복 데이터 (이메일, 전화번호 등)

### 서버 에러 (5xx)
- `500 Internal Server Error`: 서버 내부 오류

## 테스트 체크리스트

Backend:
- [ ] 각 에러 케이스별 적절한 status code 반환
- [ ] 에러 메시지가 한글로 명확하게 작성됨
- [ ] Logger로 중요한 이벤트 기록
- [ ] Zod 검증 실패 시 상세 에러 정보 포함

Frontend:
- [ ] 모든 mutation에 onError 핸들러 구현
- [ ] Toast로 사용자에게 피드백 제공
- [ ] Query에서 undefined 반환 방지 (placeholderData, 기본값)
- [ ] 프로덕션 코드에 console.log 없음
