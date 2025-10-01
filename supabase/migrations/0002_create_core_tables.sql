-- 1. Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM public, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;

-- 3. Create tables (Minimal Schema based on goal.md)

-- users (with birthdate)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    auth_id UUID UNIQUE, -- Supabase auth.users.id
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    birthdate DATE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('advertiser', 'influencer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON COLUMN public.users.auth_id IS 'Links to Supabase auth.users table';

-- influencer_profiles (simplified)
CREATE TABLE IF NOT EXISTS public.influencer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- influencer_channels (updated)
CREATE TABLE IF NOT EXISTS public.influencer_channels (
    id BIGSERIAL PRIMARY KEY,
    influencer_id BIGINT NOT NULL REFERENCES public.influencer_profiles(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    channel_url TEXT NOT NULL,
    follower_count INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON COLUMN public.influencer_channels.channel_type IS 'e.g., instagram, blog, youtube. Kept for essential distinction.';


-- advertiser_profiles (updated)
CREATE TABLE IF NOT EXISTS public.advertiser_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    company_phone VARCHAR(20) NOT NULL,
    business_number VARCHAR(50) UNIQUE NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- campaigns (core feature)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id BIGSERIAL PRIMARY KEY,
    advertiser_id BIGINT NOT NULL REFERENCES public.advertiser_profiles(id) ON DELETE CASCADE,
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

-- applications (core feature)
CREATE TABLE IF NOT EXISTS public.applications (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    influencer_id BIGINT NOT NULL REFERENCES public.influencer_profiles(id) ON DELETE CASCADE,
    message TEXT,
    visit_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'selected', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (campaign_id, influencer_id)
);


-- 4. Create triggers for updated_at
CREATE OR REPLACE TRIGGER on_users_updated
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_influencer_channels_updated
BEFORE UPDATE ON public.influencer_channels
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_advertiser_profiles_updated
BEFORE UPDATE ON public.advertiser_profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_campaigns_updated
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_applications_updated
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5. Disable RLS on all created tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;
