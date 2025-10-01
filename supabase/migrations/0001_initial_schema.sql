-- Migration: Initial Schema for Blog Experience Platform
-- Description: 블로그 체험단 플랫폼 초기 스키마 생성 (최소 구현 스펙)

BEGIN;

-- ============================================================================
-- 1. users 테이블 생성 (공통 사용자 정보)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE users IS '공통 사용자 정보 테이블';
COMMENT ON COLUMN users.id IS 'Supabase Auth와 동일한 사용자 ID';
COMMENT ON COLUMN users.name IS '사용자 이름';
COMMENT ON COLUMN users.birth_date IS '생년월일';
COMMENT ON COLUMN users.phone IS '휴대폰번호 (중복 불가)';

-- ============================================================================
-- 2. advertiser_profiles 테이블 생성 (광고주 정보)
-- ============================================================================

CREATE TABLE IF NOT EXISTS advertiser_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    business_phone VARCHAR(20) NOT NULL,
    business_registration_number VARCHAR(50) UNIQUE NOT NULL,
    representative_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_user_id ON advertiser_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_business_registration_number
    ON advertiser_profiles(business_registration_number);

ALTER TABLE advertiser_profiles DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE advertiser_profiles IS '광고주 정보 테이블';
COMMENT ON COLUMN advertiser_profiles.user_id IS '사용자 ID (users 테이블 참조)';
COMMENT ON COLUMN advertiser_profiles.business_name IS '업체명';
COMMENT ON COLUMN advertiser_profiles.address IS '주소';
COMMENT ON COLUMN advertiser_profiles.business_phone IS '업장 전화번호';
COMMENT ON COLUMN advertiser_profiles.business_registration_number IS '사업자등록번호 (중복 불가)';
COMMENT ON COLUMN advertiser_profiles.representative_name IS '대표자명';

-- ============================================================================
-- 3. influencer_profiles 테이블 생성 (인플루언서 기본 정보)
-- ============================================================================

CREATE TABLE IF NOT EXISTS influencer_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_influencer_profiles_user_id ON influencer_profiles(user_id);

ALTER TABLE influencer_profiles DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE influencer_profiles IS '인플루언서 기본 정보 테이블';
COMMENT ON COLUMN influencer_profiles.user_id IS '사용자 ID (users 테이블 참조)';

-- ============================================================================
-- 4. influencer_channels 테이블 생성 (인플루언서 SNS 채널)
-- ============================================================================

CREATE TABLE IF NOT EXISTS influencer_channels (
    id SERIAL PRIMARY KEY,
    influencer_profile_id INTEGER NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL,
    channel_name VARCHAR(200) NOT NULL,
    channel_url TEXT NOT NULL,
    followers_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_influencer_channels_profile_id ON influencer_channels(influencer_profile_id);

ALTER TABLE influencer_channels DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE influencer_channels IS '인플루언서 SNS 채널 정보 테이블 (1:N 관계)';
COMMENT ON COLUMN influencer_channels.influencer_profile_id IS '인플루언서 프로필 ID';
COMMENT ON COLUMN influencer_channels.channel_type IS '채널 유형 (naver, youtube, instagram, threads)';
COMMENT ON COLUMN influencer_channels.channel_name IS '채널명';
COMMENT ON COLUMN influencer_channels.channel_url IS '채널 링크';
COMMENT ON COLUMN influencer_channels.followers_count IS '팔로워수';

-- ============================================================================
-- 5. campaigns 테이블 생성 (체험단 정보)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    advertiser_profile_id INTEGER NOT NULL REFERENCES advertiser_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    recruitment_start TIMESTAMP NOT NULL,
    recruitment_end TIMESTAMP NOT NULL,
    benefits TEXT NOT NULL,
    mission TEXT NOT NULL,
    store_info TEXT NOT NULL,
    max_participants INTEGER NOT NULL CHECK (max_participants > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'closed', 'completed')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_recruitment_period CHECK (recruitment_end > recruitment_start)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_profile_id ON campaigns(advertiser_profile_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE campaigns IS '체험단 정보 테이블';
COMMENT ON COLUMN campaigns.advertiser_profile_id IS '광고주 프로필 ID';
COMMENT ON COLUMN campaigns.title IS '체험단명';
COMMENT ON COLUMN campaigns.recruitment_start IS '모집 시작일';
COMMENT ON COLUMN campaigns.recruitment_end IS '모집 종료일';
COMMENT ON COLUMN campaigns.benefits IS '제공 혜택';
COMMENT ON COLUMN campaigns.mission IS '미션 내용';
COMMENT ON COLUMN campaigns.store_info IS '매장 정보';
COMMENT ON COLUMN campaigns.max_participants IS '모집 인원';
COMMENT ON COLUMN campaigns.status IS '상태 (recruiting: 모집중, closed: 모집종료, completed: 선정완료)';

-- ============================================================================
-- 6. applications 테이블 생성 (체험단 지원 정보)
-- ============================================================================

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    influencer_profile_id INTEGER NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    visit_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'selected', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(campaign_id, influencer_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_campaign_id ON applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_applications_influencer_profile_id ON applications(influencer_profile_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE applications IS '체험단 지원 정보 테이블';
COMMENT ON COLUMN applications.campaign_id IS '체험단 ID';
COMMENT ON COLUMN applications.influencer_profile_id IS '인플루언서 프로필 ID';
COMMENT ON COLUMN applications.message IS '각오 한마디';
COMMENT ON COLUMN applications.visit_date IS '방문 예정일자';
COMMENT ON COLUMN applications.status IS '상태 (submitted: 제출, selected: 선정, rejected: 반려)';

-- ============================================================================
-- 7. updated_at 자동 갱신 트리거 함수 및 트리거 생성
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS '모든 테이블의 updated_at 컬럼 자동 갱신 함수';

-- 각 테이블에 트리거 적용
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertiser_profiles_updated_at
    BEFORE UPDATE ON advertiser_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influencer_profiles_updated_at
    BEFORE UPDATE ON influencer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influencer_channels_updated_at
    BEFORE UPDATE ON influencer_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- 8. 테스트용 더미 데이터 INSERT
-- ============================================================================

BEGIN;

-- 8.1 사용자 데이터 (광고주 2명, 인플루언서 3명)
INSERT INTO users (id, name, birth_date, phone) VALUES
    ('00000000-0000-0000-0000-000000000001', '김광고', '1985-03-15', '010-1111-1111'),
    ('00000000-0000-0000-0000-000000000002', '이마케팅', '1990-07-22', '010-2222-2222'),
    ('00000000-0000-0000-0000-000000000003', '박블로거', '1995-11-08', '010-3333-3333'),
    ('00000000-0000-0000-0000-000000000004', '최유튜버', '1998-05-30', '010-4444-4444'),
    ('00000000-0000-0000-0000-000000000005', '정인스타', '2000-01-12', '010-5555-5555');

-- 8.2 광고주 프로필 데이터
INSERT INTO advertiser_profiles (user_id, business_name, address, business_phone, business_registration_number, representative_name) VALUES
    ('00000000-0000-0000-0000-000000000001', '맛있는카페', '서울특별시 강남구 테헤란로 123', '02-1111-1111', '123-45-67890', '김광고'),
    ('00000000-0000-0000-0000-000000000002', '힐링스파', '서울특별시 서초구 강남대로 456', '02-2222-2222', '987-65-43210', '이마케팅');

-- 8.3 인플루언서 프로필 데이터
INSERT INTO influencer_profiles (user_id) VALUES
    ('00000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000004'),
    ('00000000-0000-0000-0000-000000000005');

-- 8.4 인플루언서 채널 데이터
INSERT INTO influencer_channels (influencer_profile_id, channel_type, channel_name, channel_url, followers_count) VALUES
    (1, 'naver', '박블로거의 맛집탐방', 'https://blog.naver.com/parkblogger', 15000),
    (1, 'instagram', '@park_foodie', 'https://instagram.com/park_foodie', 8500),
    (2, 'youtube', '최유튜버의 일상', 'https://youtube.com/@choi_vlog', 52000),
    (2, 'instagram', '@choi_daily', 'https://instagram.com/choi_daily', 23000),
    (3, 'instagram', '@jung_beauty', 'https://instagram.com/jung_beauty', 31000),
    (3, 'threads', '@jung_beauty', 'https://threads.net/@jung_beauty', 12000);

-- 8.5 체험단 데이터 (모집중 2개, 모집종료 1개)
INSERT INTO campaigns (advertiser_profile_id, title, recruitment_start, recruitment_end, benefits, mission, store_info, max_participants, status) VALUES
    (
        1,
        '맛있는카페 신메뉴 브런치 체험단',
        NOW() - INTERVAL '2 days',
        NOW() + INTERVAL '5 days',
        '브런치 세트 2인분 무료 제공, 음료 2잔 무료',
        '방문 후 24시간 내 블로그 또는 SNS 리뷰 작성 (사진 5장 이상 포함)',
        '서울특별시 강남구 테헤란로 123, 영업시간: 10:00-22:00, 주차 가능',
        10,
        'recruiting'
    ),
    (
        2,
        '힐링스파 아로마 마사지 체험단',
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '7 days',
        '아로마 마사지 60분 코스 무료, 웰컴 티 제공',
        '체험 후 3일 내 상세 후기 작성 (사진 3장 이상, 영상 추천)',
        '서울특별시 서초구 강남대로 456 2층, 영업시간: 11:00-21:00, 예약 필수',
        5,
        'recruiting'
    ),
    (
        1,
        '맛있는카페 여름 시즌 디저트 체험단',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '3 days',
        '시즌 디저트 2종 + 아이스 음료 1잔 무료',
        '방문 당일 인스타그램 스토리 업로드 필수, 피드 포스팅 권장',
        '서울특별시 강남구 테헤란로 123, 영업시간: 10:00-22:00',
        8,
        'closed'
    );

-- 8.6 체험단 지원 데이터
INSERT INTO applications (campaign_id, influencer_profile_id, message, visit_date, status) VALUES
    (1, 1, '평소 브런치를 정말 좋아합니다! 맛있는 리뷰로 보답하겠습니다.', NOW() + INTERVAL '3 days', 'submitted'),
    (1, 2, '유튜브 구독자들과 함께 브런치 맛집을 공유하고 싶습니다!', NOW() + INTERVAL '4 days', 'submitted'),
    (1, 3, '인스타그램 팔로워들에게 예쁜 브런치 사진을 보여드리겠습니다.', NOW() + INTERVAL '2 days', 'submitted'),
    (2, 1, '힐링이 필요한 요즘, 정성스러운 후기 작성하겠습니다.', NOW() + INTERVAL '5 days', 'submitted'),
    (2, 3, '뷰티 인플루언서로서 스파 체험을 공유하고 싶습니다!', NOW() + INTERVAL '6 days', 'submitted'),
    (3, 1, '여름 디저트 정말 기대됩니다! 맛있게 리뷰하겠습니다.', NOW() - INTERVAL '5 days', 'selected'),
    (3, 2, '디저트 영상 콘텐츠로 제작하겠습니다.', NOW() - INTERVAL '4 days', 'selected'),
    (3, 3, '예쁜 디저트 사진 많이 찍어서 올리겠습니다!', NOW() - INTERVAL '6 days', 'rejected');

COMMIT;
