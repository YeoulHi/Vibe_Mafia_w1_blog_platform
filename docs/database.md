# 최종 데이터베이스 설계

`goal.md`와 `userflow.md`에 명시된 최소 스펙을 기준으로, 블로그 체험단 플랫폼의 핵심 기능을 구현하기 위한 최종 데이터베이스 스키마와 데이터 흐름을 정의합니다.

## 1. 데이터베이스 관점의 데이터플로우

사용자 가입부터 체험단 신청 및 선정까지의 핵심 데이터 흐름을 시각화했습니다.

```mermaid
flowchart TD

subgraph "A. 회원가입"
    A1[1. 가입 정보 입력<br/>(이름, 이메일, 휴대폰, 생년월일, 역할)]
    A2[2. 사용자 계정 생성<br/>(users 테이블)]
end

subgraph "B. 인플루언서"
    B1[3. 인플루언서 프로필 생성<br/>(influencer_profiles)]
    B2[4. SNS 채널 정보 입력<br/>(채널명, URL, 팔로워 수)]
    B3[5. 채널 정보 저장<br/>(influencer_channels)]
end

subgraph "C. 광고주"
    C1[3. 광고주 프로필 생성<br/>(advertiser_profiles)]
    C2[4. 업체 정보 입력<br/>(업체명, 주소, 사업자번호 등)]
    C3[5. 업체 정보 저장<br/>(advertiser_profiles)]
end

subgraph "D. 체험단"
    D1[6. (광고주) 체험단 등록<br/>(campaigns)]
    D2[7. (인플루언서) 체험단 조회/지원<br/>(applications)]
    D3[8. (광고주) 지원자 선정<br/>(applications.status 변경)]
end

A2 -- 역할: 인플루언서 --> B1
A2 -- 역할: 광고주 --> C1
C3 --> D1
B3 --> D2
D1 --> D2
D2 --> D3
```

---

## 2. 데이터베이스 스키마 (PostgreSQL)

### **`users`**

*   모든 사용자의 공통 정보를 저장합니다. Supabase Auth와 연동을 위해 `auth_id`를 포함합니다.

```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    auth_id UUID UNIQUE, -- Supabase Auth User ID
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    birthdate DATE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('advertiser', 'influencer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### **`influencer_profiles`**

*   사용자가 '인플루언서' 역할을 가짐을 나타내는 테이블입니다. `users` 테이블과 1:1 관계를 맺습니다.

```sql
CREATE TABLE IF NOT EXISTS influencer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE influencer_profiles DISABLE ROW LEVEL SECURITY;
```

### **`influencer_channels`**

*   인플루언서가 등록한 SNS 채널 정보를 저장합니다. 한 인플루언서는 여러 채널을 가질 수 있습니다 (1:N 관계).

```sql
CREATE TABLE IF NOT EXISTS influencer_channels (
    id BIGSERIAL PRIMARY KEY,
    influencer_id BIGINT NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL, -- 'NAVER_BLOG', 'INSTAGRAM' 등
    channel_name VARCHAR(100) NOT NULL,
    channel_url TEXT NOT NULL,
    follower_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE influencer_channels DISABLE ROW LEVEL SECURITY;
```

### **`advertiser_profiles`**

*   광고주의 업체 정보를 저장합니다. `users` 테이블과 1:1 관계를 맺습니다.

```sql
CREATE TABLE IF NOT EXISTS advertiser_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    company_phone VARCHAR(20) NOT NULL,
    business_number VARCHAR(50) UNIQUE NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE advertiser_profiles DISABLE ROW LEVEL SECURITY;
```

### **`campaigns`**

*   광고주가 등록하는 체험단 정보를 저장합니다.

```sql
CREATE TABLE IF NOT EXISTS campaigns (
    id BIGSERIAL PRIMARY KEY,
    advertiser_id BIGINT NOT NULL REFERENCES advertiser_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    benefit TEXT,
    mission TEXT,
    store_location VARCHAR(255),
    recruit_count INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'closed', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
```

### **`applications`**

*   인플루언서의 체험단 지원 정보를 저장합니다. 중복 지원을 막기 위해 `(campaign_id, influencer_id)`에 UNIQUE 제약을 설정합니다.

```sql
CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    influencer_id BIGINT NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
    message TEXT,
    visit_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'selected', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (campaign_id, influencer_id)
);
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
```

---

## 3. 데이터베이스 추가 설정

### 3.1. `updated_at` 자동 갱신 트리거

모든 테이블에 대해, row가 업데이트될 때마다 `updated_at` 타임스탬프가 자동으로 현재 시간으로 갱신되도록 트리거가 설정되어 있습니다.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 대해 아래와 같이 트리거가 적용됩니다.
-- CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2. RLS (Row Level Security) 정책

모든 테이블의 RLS는 **비활성화**되어 있습니다. 이는 백엔드 서버가 `service_role` 키를 사용하여 모든 데이터에 접근하는 것을 허용하기 위함입니다.

---

## 4. 테스트용 더미 데이터

개발 및 테스트 편의를 위해, 초기 마이그레이션 실행 시 광고주, 인플루언서, 캠페인, 지원서에 대한 샘플 데이터가 각각 1개씩 생성됩니다.
