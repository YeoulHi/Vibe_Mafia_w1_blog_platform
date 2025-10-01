# 최종 데이터플로우 및 데이터베이스 스키마

`goal.md`의 최소 스펙을 기준으로, 오버엔지니어링을 제거하고 필수 명세를 반영한 최종 데이터베이스 구조입니다.

---

## 1. 데이터플로우

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

*   모든 사용자의 공통 정보를 저장합니다.

```sql
CREATE TABLE users (
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
```

### **`influencer_profiles`**

*   사용자가 '인플루언서' 역할을 가짐을 나타냅니다.

```sql
CREATE TABLE influencer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
```

### **`influencer_channels`**

*   인플루언서의 SNS 채널 정보를 저장합니다. (`goal.md` 스펙 반영)

```sql
CREATE TABLE influencer_channels (
    id BIGSERIAL PRIMARY KEY,
    influencer_id BIGINT NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    channel_url TEXT NOT NULL,
    follower_count INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### **`advertiser_profiles`**

*   광고주의 업체 정보를 저장합니다. (`goal.md` 스펙 반영)

```sql
CREATE TABLE advertiser_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    company_phone VARCHAR(20) NOT NULL,
    business_number VARCHAR(50) UNIQUE NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### **`campaigns`**

*   광고주가 등록하는 체험단 정보를 저장합니다.

```sql
CREATE TABLE campaigns (
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
```

### **`applications`**

*   인플루언서의 체험단 지원 정보를 저장합니다.

```sql
CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    influencer_id BIGINT NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
    message TEXT,
    visit_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'selected', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (campaign_id, influencer_id)
);
```
