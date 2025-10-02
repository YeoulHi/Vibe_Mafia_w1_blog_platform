# Task 004: 광고주 대시보드 버튼 구현 및 인증 문제 해결

## 📋 작업 개요
- **작업 일자**: 2025-10-02
- **기능 이름**: 광고주 대시보드 버튼 구현 및 인증 문제 해결
- **참조 문서**: `docs/003/plan.md`, `docs/003/spec.md`, `docs/database.md`, `docs/goal.md`

---

## ✅ 완료된 작업

### 1. 광고주 프로필 상태 확인 서비스 구현
- **파일**: `src/features/advertiser/backend/service.ts`
- **기능**: `checkAdvertiserProfileStatus()` 함수 구현
- **로직**: 
  - 사용자 역할이 `'advertiser'`인지 확인
  - `advertiser_profiles` 테이블에서 프로필 존재 여부 확인
  - `{isAdvertiser, hasProfile, needsOnboarding}` 객체 반환

### 2. 광고주 프로필 상태 확인 API 엔드포인트 추가
- **파일**: `src/features/advertiser/backend/route.ts`
- **엔드포인트**: `GET /api/advertiser/profile/status`
- **기능**: 인증된 사용자의 광고주 프로필 상태 반환
- **인증**: Bearer 토큰 기반 인증 적용

### 3. 광고주 프로필 상태 확인 React Query 훅 생성
- **파일**: `src/features/advertiser/hooks/useAdvertiserProfileStatus.ts`
- **기능**: React Query를 사용한 상태 관리
- **특징**: 
  - 인증된 경우에만 쿼리 실행
  - 5분간 캐시 유지
  - 에러 처리 및 기본값 제공

### 4. 대시보드에 광고주 정보 등록 버튼 추가
- **파일**: `src/app/(protected)/dashboard/page.tsx`
- **기능**: 광고주 역할이고 프로필이 없는 경우에만 버튼 표시
- **조건**: `advertiserStatus?.isAdvertiser && !advertiserStatus?.hasProfile`
- **UI**: 인플루언서 버튼과 함께 flex 레이아웃으로 배치

### 5. Git 커밋 및 푸시 완료
- **커밋 해시**: `fb94c61`
- **변경된 파일**: 23개 파일
- **추가된 라인**: 1,792줄
- **삭제된 라인**: 26줄

---

## ❌ 미해결 문제

### 1. 인증 문제 (401 Unauthorized)
- **현상**: API 호출 시 `401 Unauthorized` 에러 발생
- **원인**: Supabase 세션이 없거나 토큰이 유효하지 않음
- **에러 메시지**: "유효하지 않은 인증 정보입니다"
- **영향**: 광고주 버튼이 표시되지 않음

### 2. 사용자 역할 불일치
- **현상**: 광고주 계정인데 인플루언서 버튼이 표시됨
- **원인**: 데이터베이스의 `users` 테이블에서 `role` 필드가 `'influencer'`로 설정됨
- **API 응답**: `{"isInfluencer":true,"hasProfile":false,"needsOnboarding":true}`
- **예상**: `{"isAdvertiser":true,"hasProfile":false,"needsOnboarding":true}`

### 3. 세션 상태 문제
- **현상**: `window.supabase.auth.getSession()` 결과가 `undefined`
- **원인**: 로그인 상태가 유지되지 않음
- **영향**: API 호출 시 인증 토큰이 전달되지 않음

---

## 🔧 해결해야 할 작업

### 1. 인증 문제 해결
- [ ] **로그인 상태 확인**: 현재 사용자가 올바르게 로그인되어 있는지 확인
- [ ] **토큰 유효성 검증**: Supabase 세션 토큰이 유효한지 확인
- [ ] **API Client 설정**: `src/lib/remote/api-client.ts`에서 토큰 자동 추가 확인

### 2. 사용자 역할 수정
- [ ] **데이터베이스 확인**: Supabase 대시보드에서 `users` 테이블의 `role` 필드 확인
- [ ] **역할 수정**: `test23@gmail.com` 사용자의 `role`을 `'advertiser'`로 변경
- [ ] **SQL 명령어**: 
  ```sql
  UPDATE users 
  SET role = 'advertiser' 
  WHERE email = 'test23@gmail.com';
  ```

### 3. 세션 관리 개선
- [ ] **로그인 플로우 확인**: 회원가입 후 자동 로그인 처리 확인
- [ ] **세션 지속성**: 브라우저 새로고침 후에도 세션 유지 확인
- [ ] **토큰 갱신**: 만료된 토큰 자동 갱신 처리 확인

---

## 🧪 테스트 방법

### 1. 인증 상태 확인
```javascript
// 브라우저 콘솔에서 실행
window.supabase.auth.getSession().then(({ data: { session } }) => {
  console.log('세션 상태:', session ? '로그인됨' : '로그인 안됨');
  if (session) {
    console.log('토큰:', session.access_token.substring(0, 20) + '...');
  }
});
```

### 2. API 직접 호출
```javascript
// 인증 토큰을 포함한 API 호출
fetch('/api/advertiser/profile/status', {
  headers: {
    'Authorization': 'Bearer ' + session.access_token
  }
})
.then(res => res.json())
.then(data => console.log('광고주 상태:', data));
```

### 3. 데이터베이스 확인
```sql
-- 현재 사용자의 역할 확인
SELECT id, email, role, created_at 
FROM users 
WHERE email = 'test23@gmail.com';
```

---

## 📂 주요 변경 파일
- `src/features/advertiser/backend/service.ts` (새로 추가)
- `src/features/advertiser/backend/route.ts` (수정)
- `src/features/advertiser/hooks/useAdvertiserProfileStatus.ts` (새로 추가)
- `src/app/(protected)/dashboard/page.tsx` (수정)

---

## 🚀 다음 단계

### 우선순위 1: 인증 문제 해결
1. **로그인 상태 확인** 및 **토큰 유효성 검증**
2. **API Client interceptor** 작동 여부 확인
3. **세션 관리** 개선

### 우선순위 2: 사용자 역할 수정
1. **데이터베이스에서 역할 확인**
2. **필요시 역할 수정**
3. **버튼 표시 확인**

### 우선순위 3: 통합 테스트
1. **광고주 계정으로 로그인**
2. **대시보드에서 광고주 버튼 확인**
3. **버튼 클릭 시 온보딩 페이지 이동 확인**

---

## 📝 참고사항

- **인플루언서 패턴**: 기존 인플루언서 구현과 동일한 패턴으로 구현
- **역할 기반 접근 제어**: `role` 필드 기반으로 버튼 표시/숨김 처리
- **에러 처리**: React Query의 에러 처리 및 기본값 제공
- **캐싱**: 5분간 캐시 유지로 성능 최적화

