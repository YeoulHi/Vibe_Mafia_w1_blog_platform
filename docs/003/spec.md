# 3. 광고주 정보 등록

- **Primary Actor**: 가입을 완료한 광고주
- **Precondition**:
    - 사용자는 '광고주' 역할로 가입을 완료했다.
    - 사용자는 아직 광고주 상세 정보를 등록하지 않았다.
- **Trigger**: 회원가입 직후 또는 '마이페이지'에서 정보 등록을 시작한다.

---

### Main Scenario

1. 사용자는 광고주 정보 입력 페이지에 접속한다.
2. 사용자는 업체명, 사업자등록번호, 주소, 업종 카테고리 등의 정보를 입력한다.
3. 사용자가 '제출' 버튼을 클릭한다.
4. 시스템은 입력된 정보의 형식과 유효성을 검증한다. (e.g., 사업자등록번호 형식)
5. 시스템은 검증된 정보를 `advertiser_profiles` 테이블에 저장한다.
6. 시스템은 사업자등록번호의 실제 유효성을 확인하기 위해 외부 API를 통한 비동기 검증 작업을 시작한다.
7. 사용자에게 "정보가 성공적으로 제출되었으며, 사업자 정보 검증이 진행 중입니다."와 같은 피드백을 표시한다.

---

### Edge Cases

- **잘못된 사업자등록번호 형식**: 사업자등록번호가 표준 형식에 맞지 않을 경우, 실시간으로 오류를 알린다.
- **중복된 사업자등록번호**: 이미 등록된 사업자등록번호일 경우, 제출을 차단하고 오류 메시지를 표시한다.
- **외부 API 검증 실패**: 비동기 검증 과정에서 사업자 정보가 유효하지 않은 것으로 확인될 경우, 사용자에게 알리고 수정을 요청한다.

---

### Business Rules

- 하나의 사업자등록번호는 하나의 계정에만 연결될 수 있다.
- 사업자 정보 검증이 완료되어야만 체험단을 생성하고 관리할 수 있는 모든 권한이 부여된다.
- 필수 정보를 모두 입력해야 제출이 가능하다.

---

### Sequence Diagram

```plantuml
@startuml
title 3. 광고주 정보 등록

actor User as "Advertiser"
participant FE as "Frontend"
participant BE as "Backend"
database DB as "Database"
queue JobQueue as "Job Queue"

User -> FE: 광고주 정보 등록 페이지 접속
FE -> User: 정보 입력 폼 표시

User -> FE: 업체명, 사업자등록번호 등 정보 입력
User -> FE: '제출' 버튼 클릭

FE -> BE: 정보 제출 (POST /api/advertiser/profile)
BE -> BE: 입력값 유효성 검사 (필수값, 형식 등)
alt 유효성 검사 실패
    BE -> FE: 오류 응답 (400 Bad Request)
    FE -> User: 오류 메시지 표시
else 유효성 검사 성공
    BE -> DB: 사업자등록번호 중복 확인
    alt 중복된 사업자번호
        DB -> BE: 중복됨
        BE -> FE: 오류 응답 (409 Conflict)
        FE -> User: "이미 등록된 사업자번호입니다." 메시지 표시
    else 사용 가능
        BE -> DB: 광고주 프로필 정보 저장 (상태: PENDING_VERIFICATION)
        DB -> BE: 저장 완료
        BE -> JobQueue: 사업자번호 유효성 검증 작업 추가
        BE -> FE: 성공 응답 (200 OK)
        FE -> User: "제출 완료. 사업자 정보 검증이 진행됩니다." 메시지 표시
    end
end

@enduml
```
