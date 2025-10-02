# Task 001: 회원가입 및 로그인 기능 구현 및 디버깅

## 작업 일시
2025-10-02

## 담당자
Claude AI + Developer

---

## 1. 작업 개요

회원가입 및 로그인 기능 구현 중 발생한 다양한 에러를 해결하고, Next.js + Hono + Supabase 통합 구조를 완성했습니다.

---

## 2. 개선 포인트 (기능 키워드 단위)

### 2.1 API 라우팅 연결
**문제**: 프론트엔드에서 `/auth/signup` 요청 시 404 에러 발생
**원인**:
- 프론트엔드 API baseURL 미설정 (`NEXT_PUBLIC_API_BASE_URL` 환경 변수 누락)
- Hono 앱에 basePath 미설정

**해결**:
1. `.env.local`에 `NEXT_PUBLIC_API_BASE_URL=/api` 추가
2. `src/backend/hono/app.ts`에서 Hono 앱 생성 시 `.basePath('/api')` 추가
   ```typescript
   const app = new Hono<AppEnv>().basePath('/api');
   ```

**결과**: `/api/auth/signup` 경로로 정상 라우팅됨

---

### 2.2 폼 검증 (Form Validation)
**문제**: 모든 필드를 입력해도 회원가입 버튼이 비활성화됨
**원인**: react-hook-form의 `isValid`가 폼이 제출되거나 모든 필드가 touch된 후에만 업데이트됨

**해결**: `src/features/auth/components/SignUpForm.tsx`에 `mode: "onChange"` 추가
```typescript
const form = useForm<ClientSignUpForm>({
  resolver: zodResolver(clientSignUpSchema),
  mode: "onChange",  // 추가
  // ...
});
```

**결과**: 필드 입력 시 실시간으로 유효성 검사되어 버튼 활성화

---

### 2.3 데이터베이스 권한 (Supabase RLS)
**문제**: 회원가입 시 500 에러 - `permission denied for schema public`
**원인**:
- Supabase migration SQL 미적용
- RLS(Row Level Security)가 활성화되어 있거나 service_role 권한 부족

**해결**:
1. Migration SQL 실행 (`0002_SQL_editor.sql` - 더미 데이터 제외 버전)
2. RLS 비활성화 및 권한 부여:
   ```sql
   -- RLS 비활성화
   ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.influencer_profiles DISABLE ROW LEVEL SECURITY;
   -- ... (모든 테이블)

   -- service_role 권한 부여
   GRANT USAGE ON SCHEMA public TO service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
   ```

**결과**: 사용자 생성 및 프로필 저장 정상 작동

---

### 2.4 이메일 인증 (Email Confirmation)
**문제**: 회원가입 성공 후 로그인 시 `email_not_confirmed` 에러
**원인**: `src/features/auth/backend/service.ts`에서 `email_confirm: false`로 사용자 생성

**해결**:
1. **단기 해결 (개발 환경)**:
   - `service.ts`에서 `email_confirm: true`로 변경
   - Trigger를 통한 자동 이메일 확인:
   ```sql
   CREATE OR REPLACE FUNCTION auto_confirm_email()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.email_confirmed_at IS NULL THEN
       NEW.email_confirmed_at = NOW();
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created_auto_confirm
     BEFORE INSERT ON auth.users
     FOR EACH ROW
     EXECUTE FUNCTION auto_confirm_email();
   ```

2. **기존 사용자 처리**:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = NOW()
   WHERE email_confirmed_at IS NULL;
   ```

**결과**: 회원가입 즉시 로그인 가능

---

## 3. 작업 순서 (시간 흐름)

### 3.1 초기 문제 발견 (10:00)
- 회원가입 페이지에서 404 에러 발생
- 네트워크 탭 확인: `POST http://localhost:3000/auth/signup 404 (Not Found)`

### 3.2 API 라우팅 문제 해결 (10:15)
1. 환경 변수 확인 및 추가 (`.env.local`)
2. Hono basePath 설정 확인 및 수정
3. 개발 서버 재시작

### 3.3 폼 검증 문제 해결 (10:30)
1. 회원가입 버튼 비활성화 원인 분석
2. react-hook-form 모드 변경 (`mode: "onChange"`)
3. 불필요한 import 정리

### 3.4 데이터베이스 권한 문제 해결 (10:45)
1. 500 에러 Response 분석: `permission denied for schema public`
2. Migration SQL 실행 (더미 데이터 제외)
3. Supabase에서 RLS 상태 확인 및 비활성화
4. service_role 권한 부여

### 3.5 이메일 인증 문제 해결 (11:15)
1. 회원가입 성공 후 로그인 실패 분석
2. `email_not_confirmed` 에러 원인 파악
3. Backend service 코드 수정 (`email_confirm: true`)
4. Trigger를 통한 자동 이메일 확인 구현
5. 기존 사용자 일괄 처리

### 3.6 최종 검증 (11:30)
- 회원가입 → 로그인 플로우 정상 작동 확인
- 네트워크 요청/응답 정상 확인

---

## 4. 기술 스택 및 아키텍처

### 사용된 기술
- **Frontend**: Next.js 15, React Hook Form, Zod, TanStack Query
- **Backend**: Hono.js, Supabase (service-role)
- **Database**: PostgreSQL (Supabase)

### 아키텍처 구조
```
Client (Browser)
  └─> API Client (/api/auth/signup)
      └─> Next.js Route Handler (/api/[[...hono]]/route.ts)
          └─> Hono App (basePath: /api)
              └─> Auth Routes (/auth/signup)
                  └─> Auth Service
                      ├─> Supabase Auth (auth.users)
                      └─> Supabase DB (public.users)
```

---

## 5. 추가 개선 제안

### 5.1 프로덕션 환경 대비
- [ ] 이메일 인증 플로우 구현 (Supabase Email Templates)
- [ ] 에러 핸들링 강화 (toast 메시지 개선)
- [ ] 로깅 시스템 구축 (winston, pino 등)

### 5.2 보안 강화
- [ ] Rate Limiting 추가 (회원가입/로그인 요청 제한)
- [ ] CSRF 토큰 적용
- [ ] Input Sanitization 강화

### 5.3 사용자 경험 개선
- [ ] 회원가입 후 프로필 설정 페이지로 자동 이동
- [ ] 비밀번호 강도 체크 UI
- [ ] 휴대폰 번호 포맷 자동 변환

---

## 6. 참고 문서
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 가이드라인
- [docs/001/spec.md](../001/spec.md) - 회원가입 스펙
- [docs/001/plan.md](../001/plan.md) - 회원가입 플랜
- Supabase 공식 문서: https://supabase.com/docs

---

## 7. 다음 작업 (docs/002)
- **인플루언서 정보 등록 기능** 구현 예정
- Backend API 및 Frontend 폼 구현
- 동적 SNS 채널 추가/삭제 기능 (`useFieldArray`)
