# 블로그 체험단 SaaS — 데이터베이스 설계 문서

## 개요

본 문서는 블로그 체험단 플랫폼의 최소 구현 스펙 기반 데이터베이스 설계를 정의합니다.
PostgreSQL을 사용하며, Supabase를 통해 관리됩니다.

---

## 데이터플로우

### 1. 회원가입 (공통)

```
입력: 이름, 생년월일, 휴대폰번호
↓
users 테이블 생성
↓
역할 선택 (광고주 / 인플루언서)
```

### 2-A. 광고주 정보 등록

```
입력: 업체명, 주소, 업장 전화번호, 사업자등록번호, 대표자명
↓
advertiser_profiles 테이블 생성
↓
체험단 관리 페이지 접근 가능
```

### 2-B. 인플루언서 정보 등록

```
입력: SNS 채널명, 채널링크, 팔로워수
↓
influencer_profiles 테이블 생성
↓
influencer_channels 테이블에 채널 정보 저장 (1:N 관계)
↓
체험단 지원 가능
```

### 3. 체험단 등록 (광고주)

```
입력: 체험단명, 모집기간, 모집인원, 제공혜택, 매장정보, 미션
↓
campaigns 테이블 생성
↓
status = 'recruiting' (모집중)
```

### 4. 체험단 지원 (인플루언서)

```
입력: 각오 한마디, 방문 예정일자
↓
applications 테이블 생성
↓
status = 'submitted' (제출됨)
↓
중복 지원 방지 (UNIQUE 제약)
```

### 5. 체험단 모집 관리 (광고주)

```
[모집종료 버튼 클릭]
campaigns.status: 'recruiting' → 'closed'
↓
[체험단 선정 버튼 클릭]
선정된 인원: applications.status = 'submitted' → 'selected'
미선정 인원: applications.status = 'submitted' → 'rejected'
campaigns.status: 'closed' → 'completed'
```

---

## 데이터베이스 스키마

### 1. users (공통 사용자 정보)

기본 사용자 정보를 저장하는 테이블입니다. Supabase Auth의 `auth.users`와 `id`로 연동됩니다.

| 컬럼명       | 타입           | 제약조건                  | 설명                      |
|--------------|----------------|---------------------------|---------------------------|
| id           | UUID           | PRIMARY KEY, DEFAULT      | Supabase Auth와 동일한 ID |
| name         | VARCHAR(100)   | NOT NULL                  | 사용자 이름               |
| birth_date   | DATE           | NOT NULL                  | 생년월일                  |
| phone        | VARCHAR(20)    | UNIQUE, NOT NULL          | 휴대폰번호                |
| created_at   | TIMESTAMP      | DEFAULT NOW()             | 생성 시각                 |
| updated_at   | TIMESTAMP      | DEFAULT NOW()             | 수정 시각                 |

**인덱스:**
- `phone` (UNIQUE)

---

### 2. advertiser_profiles (광고주 정보)

광고주의 사업자 정보를 저장하는 테이블입니다.

| 컬럼명                        | 타입           | 제약조건                        | 설명                 |
|-------------------------------|----------------|---------------------------------|----------------------|
| id                            | SERIAL         | PRIMARY KEY                     | 광고주 프로필 ID     |
| user_id                       | UUID           | UNIQUE, NOT NULL, FK(users.id)  | 사용자 ID            |
| business_name                 | VARCHAR(200)   | NOT NULL                        | 업체명               |
| address                       | TEXT           | NOT NULL                        | 주소                 |
| business_phone                | VARCHAR(20)    | NOT NULL                        | 업장 전화번호        |
| business_registration_number  | VARCHAR(50)    | UNIQUE, NOT NULL                | 사업자등록번호       |
| representative_name           | VARCHAR(100)   | NOT NULL                        | 대표자명             |
| created_at                    | TIMESTAMP      | DEFAULT NOW()                   | 생성 시각            |
| updated_at                    | TIMESTAMP      | DEFAULT NOW()                   | 수정 시각            |

**인덱스:**
- `user_id` (UNIQUE)
- `business_registration_number` (UNIQUE)

**외래 키:**
- `user_id` → `users(id)` ON DELETE CASCADE

---

### 3. influencer_profiles (인플루언서 기본 정보)

인플루언서의 기본 프로필 정보를 저장하는 테이블입니다.
생년월일은 `users` 테이블에 있으므로 중복 저장하지 않습니다.

| 컬럼명       | 타입       | 제약조건                       | 설명                    |
|--------------|------------|--------------------------------|-------------------------|
| id           | SERIAL     | PRIMARY KEY                    | 인플루언서 프로필 ID    |
| user_id      | UUID       | UNIQUE, NOT NULL, FK(users.id) | 사용자 ID               |
| created_at   | TIMESTAMP  | DEFAULT NOW()                  | 생성 시각               |
| updated_at   | TIMESTAMP  | DEFAULT NOW()                  | 수정 시각               |

**인덱스:**
- `user_id` (UNIQUE)

**외래 키:**
- `user_id` → `users(id)` ON DELETE CASCADE

---

### 4. influencer_channels (인플루언서 SNS 채널)

인플루언서의 SNS 채널 정보를 저장하는 테이블입니다.
한 인플루언서가 여러 채널을 운영할 수 있으므로 1:N 관계입니다.

| 컬럼명                | 타입         | 제약조건                                    | 설명                                  |
|-----------------------|--------------|---------------------------------------------|---------------------------------------|
| id                    | SERIAL       | PRIMARY KEY                                 | 채널 ID                               |
| influencer_profile_id | INTEGER      | NOT NULL, FK(influencer_profiles.id)        | 인플루언서 프로필 ID                  |
| channel_type          | VARCHAR(50)  | NOT NULL                                    | 채널 유형 (naver, youtube, instagram, threads) |
| channel_name          | VARCHAR(200) | NOT NULL                                    | 채널명                                |
| channel_url           | TEXT         | NOT NULL                                    | 채널 링크                             |
| followers_count       | INTEGER      | DEFAULT 0                                   | 팔로워수                              |
| created_at            | TIMESTAMP    | DEFAULT NOW()                               | 생성 시각                             |
| updated_at            | TIMESTAMP    | DEFAULT NOW()                               | 수정 시각                             |

**인덱스:**
- `influencer_profile_id`

**외래 키:**
- `influencer_profile_id` → `influencer_profiles(id)` ON DELETE CASCADE

---

### 5. campaigns (체험단 정보)

광고주가 등록한 체험단 정보를 저장하는 테이블입니다.

| 컬럼명                | 타입         | 제약조건                                     | 설명                                  |
|-----------------------|--------------|----------------------------------------------|---------------------------------------|
| id                    | SERIAL       | PRIMARY KEY                                  | 체험단 ID                             |
| advertiser_profile_id | INTEGER      | NOT NULL, FK(advertiser_profiles.id)         | 광고주 프로필 ID                      |
| title                 | VARCHAR(200) | NOT NULL                                     | 체험단명                              |
| recruitment_start     | TIMESTAMP    | NOT NULL                                     | 모집 시작일                           |
| recruitment_end       | TIMESTAMP    | NOT NULL                                     | 모집 종료일                           |
| benefits              | TEXT         | NOT NULL                                     | 제공 혜택                             |
| mission               | TEXT         | NOT NULL                                     | 미션 내용                             |
| store_info            | TEXT         | NOT NULL                                     | 매장 정보                             |
| max_participants      | INTEGER      | NOT NULL, CHECK (max_participants > 0)       | 모집 인원                             |
| status                | VARCHAR(20)  | NOT NULL, DEFAULT 'recruiting'               | 상태 (recruiting, closed, completed)  |
| created_at            | TIMESTAMP    | DEFAULT NOW()                                | 생성 시각                             |
| updated_at            | TIMESTAMP    | DEFAULT NOW()                                | 수정 시각                             |

**체크 제약:**
- `status IN ('recruiting', 'closed', 'completed')`
- `recruitment_end > recruitment_start`
- `max_participants > 0`

**인덱스:**
- `advertiser_profile_id`
- `status`

**외래 키:**
- `advertiser_profile_id` → `advertiser_profiles(id)` ON DELETE CASCADE

---

### 6. applications (체험단 지원 정보)

인플루언서의 체험단 지원 정보를 저장하는 테이블입니다.

| 컬럼명                | 타입         | 제약조건                                     | 설명                                  |
|-----------------------|--------------|----------------------------------------------|---------------------------------------|
| id                    | SERIAL       | PRIMARY KEY                                  | 지원 ID                               |
| campaign_id           | INTEGER      | NOT NULL, FK(campaigns.id)                   | 체험단 ID                             |
| influencer_profile_id | INTEGER      | NOT NULL, FK(influencer_profiles.id)         | 인플루언서 프로필 ID                  |
| message               | TEXT         | NOT NULL                                     | 각오 한마디                           |
| visit_date            | DATE         | NOT NULL                                     | 방문 예정일자                         |
| status                | VARCHAR(20)  | NOT NULL, DEFAULT 'submitted'                | 상태 (submitted, selected, rejected)  |
| created_at            | TIMESTAMP    | DEFAULT NOW()                                | 생성 시각                             |
| updated_at            | TIMESTAMP    | DEFAULT NOW()                                | 수정 시각                             |

**체크 제약:**
- `status IN ('submitted', 'selected', 'rejected')`

**유니크 제약:**
- `UNIQUE(campaign_id, influencer_profile_id)` — 중복 지원 방지

**인덱스:**
- `campaign_id`
- `influencer_profile_id`
- `status`

**외래 키:**
- `campaign_id` → `campaigns(id)` ON DELETE CASCADE
- `influencer_profile_id` → `influencer_profiles(id)` ON DELETE CASCADE

---

## 주요 설계 결정 사항

### 1. 팔로워수 필드 배치
- **위치**: `influencer_channels` 테이블
- **이유**: 한 인플루언서가 여러 채널을 운영할 경우 채널마다 팔로워수가 다름

### 2. 생년월일 위치
- **위치**: `users` 테이블
- **이유**: 공통 정보이며, 중복 저장 방지

### 3. 이메일 필드
- **제외**: goal.md 명세에 없으므로 제거
- **대안**: Supabase Auth 사용 시 `auth.users` 테이블 활용

### 4. 상태값 정의
- **campaigns**: `recruiting` (모집중) → `closed` (모집종료) → `completed` (선정완료)
- **applications**: `submitted` (제출됨) → `selected` (선정) / `rejected` (반려)

### 5. 검증 로직
- **제외**: `verification_status` 필드 전부 제거
- **이유**: 최소 구현 스펙에 검증 프로세스 미포함

### 6. RLS (Row Level Security)
- **비활성화**: 모든 테이블에서 RLS 사용하지 않음
- **접근 제어**: 애플리케이션 레이어에서 처리

---

## 트리거 및 자동화

### updated_at 자동 갱신

모든 테이블의 `updated_at` 컬럼은 레코드 수정 시 자동으로 현재 시각으로 갱신됩니다.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

각 테이블마다 트리거 적용:
```sql
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 마이그레이션 파일 목록

1. `0001_create_users_table.sql`
2. `0002_create_advertiser_profiles_table.sql`
3. `0003_create_influencer_profiles_and_channels_table.sql`
4. `0004_create_campaigns_table.sql`
5. `0005_create_applications_table.sql`
6. `0006_add_updated_at_triggers.sql`

---

## 데이터 무결성 정책

### 외래 키 삭제 정책
- 모든 외래 키는 `ON DELETE CASCADE` 적용
- 사용자 삭제 시 관련 프로필, 지원 정보 등 자동 삭제

### 유니크 제약
- `users.phone`: 휴대폰번호 중복 방지
- `advertiser_profiles.user_id`: 한 사용자당 하나의 광고주 프로필
- `advertiser_profiles.business_registration_number`: 사업자등록번호 중복 방지
- `influencer_profiles.user_id`: 한 사용자당 하나의 인플루언서 프로필
- `applications(campaign_id, influencer_profile_id)`: 동일 체험단 중복 지원 방지

### 체크 제약
- `campaigns.max_participants > 0`: 모집 인원은 1명 이상
- `campaigns.recruitment_end > recruitment_start`: 모집 종료일은 시작일보다 이후
- 상태 값: ENUM 제약을 통한 유효한 상태값만 허용

---

## 확장 고려사항 (현재 미구현)

다음 기능들은 현재 최소 구현 스펙에서 제외되었으나, 향후 확장 시 고려할 수 있습니다:

1. **검증 시스템**
   - `verification_status` 필드 추가
   - 사업자등록번호 외부 API 검증
   - SNS 채널 소유권 검증

2. **내 지원 목록 페이지**
   - 현재는 `applications` 테이블 조회로 가능
   - 추가 뷰나 인덱스 최적화 가능

3. **임시저장 기능**
   - `draft` 상태 추가
   - 작성 중인 데이터 별도 저장

4. **감사 로그**
   - 중요 작업 이력 추적
   - 별도 `audit_logs` 테이블

5. **소프트 삭제**
   - `deleted_at` 필드 추가
   - 데이터 복구 기능

6. **이메일 인증**
   - `users` 테이블에 `email` 필드 추가
   - Supabase Auth 이메일 인증 연동
