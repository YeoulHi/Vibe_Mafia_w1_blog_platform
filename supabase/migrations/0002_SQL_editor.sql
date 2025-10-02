-- 0001_initial_schema_and_data.sql
-- 이 파일은 프로젝트의 초기 데이터베이스 스키마를 생성합니다.
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