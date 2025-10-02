# 1. 회원가입 및 역할 선택 (Core User Creation)

- **Primary Actor**: 신규 방문자
- **Precondition**: 사용자는 서비스에 가입되어 있지 않다.
- **Trigger**: 사용자가 '회원가입' 버튼을 클릭한다.

---

### Main Scenario

1.  사용자는 회원가입 페이지에서 **공통 정보(이름, 이메일, 연락처, 생년월일, 비밀번호)**를 입력하고, 서비스 약관에 동의한다.
2.  사용자는 자신의 **역할(광고주 또는 인플루언서)**을 선택한다.
3.  시스템은 입력 정보의 유효성을 검사한다. (비밀번호 일치 여부, 필드 형식 등)
4.  시스템은 `auth.users` 테이블에 인증 계정을 생성하고, `public.users` 테이블에 공통 프로필 정보를 저장한다.
5.  시스템은 사용자에게 이메일 인증을 요청하는 메일을 발송한다.
6.  사용자가 이메일 내 인증 링크를 클릭하면, 계정이 활성화되고 가입이 완료된다.
7.  사용자가 로그인하면, 시스템은 해당 유저의 프로필 완성 여부를 체크한다.
8.  만약 프로필이 미완성 상태일 경우, 선택했던 역할에 맞는 **추가 정보 입력 페이지(광고주/인플루언서 정보 등록)로 강제 리디렉션된다.**

---

### Edge Cases

-   **이메일 중복**: 이미 가입된 이메일일 경우, "이미 가입된 이메일입니다." 에러 메시지를 표시하고 로그인 페이지로 안내한다.
-   **인증 이메일 미수신**: 사용자가 인증 이메일을 받지 못한 경우, 재전송 기능을 제공한다.
-   **유효성 검사 실패**: 입력 정보가 형식에 맞지 않을 경우, 실시간으로 필드 하단에 오류를 표시한다.

---

### Business Rules

-   하나의 이메일 계정으로 광고주와 인플루언서 역할을 동시에 가질 수 없다.
-   약관 동의는 필수 항목이다.
-   이메일 인증을 완료해야만 서비스의 핵심 기능을 사용할 수 있다.
-   역할별 추가 정보(광고주/인플루언서 프로필)를 모두 입력해야만 각 역할에 맞는 핵심 기능(체험단 등록/지원)을 사용할 수 있다.

---

### Sequence Diagram

```plantuml
@startuml
title 1. 회원가입 및 역할선택 플로우

actor User
participant FE as "Frontend"
participant BE as "Backend"
database DB as "Database"

group Initial Sign-up
    User -> FE: 회원가입 페이지 접속
    FE -> User: 공통 정보 입력 양식 표시

    User -> FE: 정보 입력 및 제출
(이름, 이메일, 연락처, 생년월일, 역할 등)
    FE -> BE: 회원가입 요청 (POST /api/auth/signup)
    BE -> BE: 입력값 유효성 검사
    alt 유효성 검사 실패
        BE -> FE: 오류 응답 (400 Bad Request)
        FE -> User: 필드별 오류 메시지 표시
    else 유효성 검사 성공
        BE -> DB: 이메일 중복 확인
        alt 이메일 중복
            DB -> BE: 중복됨
            BE -> FE: 오류 응답 (409 Conflict)
            FE -> User: "이미 가입된 이메일입니다." 메시지 표시
        else 이메일 사용 가능
            BE -> DB: **auth.users, public.users** 테이블에
공통 정보 기반으로 계정 생성
            DB -> BE: 생성 완료
            BE -> BE: 인증 이메일 발송
            BE -> FE: 성공 응답 (201 Created)
            FE -> User: "인증 이메일을 확인해주세요." 메시지 표시
        end
    end
end

group Email Verification & First Login
    User -> BE: 이메일 인증 링크 클릭
    BE -> DB: 사용자 상태 업데이트 (PENDING -> ACTIVE)
    BE -> FE: 인증 성공 및 로그인 페이지로 리디렉션

    User -> FE: 로그인 시도
    FE -> BE: 로그인 요청
    BE -> DB: 사용자 인증 및 정보 조회
    DB -> BE: 인증 성공, 사용자 정보(role 포함) 반환
    BE -> FE: 로그인 성공, 토큰 및 사용자 정보 전달
end

group Profile Completion (Onboarding)
    FE -> FE: **프로필 완성 여부 확인**
(e.g., advertiser_profiles or influencer_profiles 존재 여부)
    alt 프로필 미완성
        FE -> User: **역할별 추가 정보 입력 페이지로 강제 리디렉션**
(/profile/complete-advertiser or /profile/complete-influencer)
    else 프로필 완성
        FE -> User: 정상적인 서비스 메인 페이지로 이동
    end
end

@enduml
```