-- 0001_initial_schema_and_data.sql
-- 이 파일은 프로젝트의 초기 데이터베이스 스키마와 테스트용 더미 데이터를 생성합니다.
-- 모든 테이블 생성, 트리거 설정, RLS 비활성화를 포함합니다.

-- 1. 테이블 생성

-- users: 모든 사용자의 공통 정보
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    auth_id UUID UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    birthdate DATE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('advertiser', 'influencer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- influencer_profiles: 인플루언서 역할 사용자의 프로필
CREATE TABLE IF NOT EXISTS influencer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE influencer_profiles DISABLE ROW LEVEL SECURITY;

-- influencer_channels: 인플루언서의 SNS 채널 정보
CREATE TABLE IF NOT EXISTS influencer_channels (
    id BIGSERIAL PRIMARY KEY,
    influencer_id BIGINT NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    channel_url TEXT NOT NULL,
    follower_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE influencer_channels DISABLE ROW LEVEL SECURITY;

-- advertiser_profiles: 광고주 역할 사용자의 업체 정보
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

-- campaigns: 광고주가 등록하는 체험단 정보
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

-- applications: 인플루언서의 체험단 지원 정보
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

-- 2. updated_at 자동 갱신 트리거 설정

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_influencer_profiles_updated_at BEFORE UPDATE ON influencer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_influencer_channels_updated_at BEFORE UPDATE ON influencer_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_advertiser_profiles_updated_at BEFORE UPDATE ON advertiser_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. 테스트용 더미 데이터 삽입
-- ON CONFLICT DO NOTHING을 사용하여 여러 번 실행해도 오류가 발생하지 않도록 합니다.

-- 광고주 사용자 및 프로필 생성
INSERT INTO users (name, phone, email, birthdate, role)
VALUES ('김광고', '010-1111-1111', 'advertiser@example.com', '1985-01-15', 'advertiser')
ON CONFLICT (email) DO NOTHING;

INSERT INTO advertiser_profiles (user_id, company_name, location, company_phone, business_number, owner_name)
SELECT id, '맛있는 파스타', '서울시 강남구 테헤란로 123', '02-111-1111', '123-45-67890', '김광고'
FROM users WHERE email = 'advertiser@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- 인플루언서 사용자 및 프로필/채널 생성
INSERT INTO users (name, phone, email, birthdate, role)
VALUES ('박플루', '010-2222-2222', 'influencer@example.com', '1995-05-20', 'influencer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO influencer_profiles (user_id)
SELECT id FROM users WHERE email = 'influencer@example.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO influencer_channels (influencer_id, channel_type, channel_name, channel_url, follower_count)
SELECT ip.id, 'NAVER_BLOG', '박플루의 맛집 탐방', 'https://blog.naver.com/parkflu', 15000
FROM influencer_profiles ip JOIN users u ON ip.user_id = u.id
WHERE u.email = 'influencer@example.com'
ON CONFLICT DO NOTHING;

-- 체험단 캠페인 생성
INSERT INTO campaigns (advertiser_id, title, benefit, mission, store_location, recruit_count, start_date, end_date)
SELECT ap.id, '신메뉴! 로제 파스타 체험단 모집', '로제 파스타 1개, 에이드 1잔 제공', '네이버 블로그에 사진 5장 이상 포함된 리뷰 작성', '서울시 강남구 테헤란로 123', 5, current_date, current_date + interval '14 day'
FROM advertiser_profiles ap JOIN users u ON ap.user_id = u.id
WHERE u.email = 'advertiser@example.com'
ON CONFLICT DO NOTHING;

-- 체험단 지원 데이터 생성
INSERT INTO applications (campaign_id, influencer_id, message, visit_date)
SELECT
    (SELECT id FROM campaigns WHERE title LIKE '신메뉴! 로제 파스타%'),
    (SELECT ip.id FROM influencer_profiles ip JOIN users u ON ip.user_id = u.id WHERE u.email = 'influencer@example.com'),
    '파스타를 정말 좋아합니다! 맛있게 먹고 정성스러운 리뷰 남기겠습니다.',
    current_date + interval '7 day'
ON CONFLICT (campaign_id, influencer_id) DO NOTHING;
