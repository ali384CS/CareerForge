-- ============================================
-- CAREERFORGE — DATABASE MIGRATION SCRIPT (PIPELINE VERSION)
-- ============================================
-- 
-- This script configures all the tables, indexes, Row Level Security,
-- and sync triggers. Enforces auth.users as identity anchor.
-- ============================================

-- Drop dependent tables first to allow clean recreation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.job_matches CASCADE;
DROP TABLE IF EXISTS public.optimized_cvs CASCADE;
DROP TABLE IF EXISTS public.scores CASCADE;
DROP TABLE IF EXISTS public.cvs CASCADE;
DROP TABLE IF EXISTS public.jobs_cache CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;


-- ============================================
-- TABLE: users (Profile Cache)
-- ============================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'User profiles linked to Supabase Auth';


-- ============================================
-- TABLE: cvs
-- ============================================
CREATE TABLE public.cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url TEXT,
    filename TEXT,
    parsed_text TEXT,
    is_active BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.cvs IS 'Uploaded CVs with parsed text content and active status';


-- ============================================
-- TABLE: scores
-- ============================================
CREATE TABLE public.scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id UUID NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_description TEXT,
    score NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.scores IS 'ATS scoring history for CVs against job descriptions';


-- ============================================
-- TABLE: jobs_cache
-- ============================================
CREATE TABLE public.jobs_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT UNIQUE NOT NULL,
    query_text TEXT,
    results JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.jobs_cache IS 'Global cache of job search results by query hash';


-- ============================================
-- TABLE: optimized_cvs
-- ============================================
CREATE TABLE public.optimized_cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id UUID NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
    job_description TEXT,
    optimized_text TEXT,
    suggestions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.optimized_cvs IS 'AI-optimized versions of uploaded CVs';


-- ============================================
-- TABLE: job_matches
-- ============================================
CREATE TABLE public.job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id UUID NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    company TEXT,
    job_url TEXT,
    match_score INTEGER,
    skill_gaps JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.job_matches IS 'Job matches saved by users for their CVs';


-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON public.cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_is_active ON public.cvs(is_active);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_cv_id ON public.scores(cv_id);
CREATE INDEX IF NOT EXISTS idx_optimized_cvs_cv_id ON public.optimized_cvs(cv_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_cv_id ON public.job_matches(cv_id);
CREATE INDEX IF NOT EXISTS idx_jobs_cache_hash ON public.jobs_cache(query_hash);


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimized_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;


-- ============================================
-- RLS POLICIES
-- ============================================

-- Policies for users
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can create their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Policies for cvs
CREATE POLICY "Users can view their own CVs" ON public.cvs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own CVs" ON public.cvs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own CVs" ON public.cvs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own CVs" ON public.cvs FOR DELETE USING (auth.uid() = user_id);

-- Policies for scores
CREATE POLICY "Users can view their own scores" ON public.scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scores" ON public.scores FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scores" ON public.scores FOR DELETE USING (auth.uid() = user_id);

-- Policies for jobs_cache (Shared global query cache)
CREATE POLICY "Allow read access to all authenticated users for jobs_cache" ON public.jobs_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access to all authenticated users for jobs_cache" ON public.jobs_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update access to all authenticated users for jobs_cache" ON public.jobs_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies for optimized_cvs
CREATE POLICY "Users can view their own optimized CVs" ON public.optimized_cvs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cvs WHERE cvs.id = optimized_cvs.cv_id AND cvs.user_id = auth.uid())
);
CREATE POLICY "Users can create optimized CVs for their own CVs" ON public.optimized_cvs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.cvs WHERE cvs.id = optimized_cvs.cv_id AND cvs.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own optimized CVs" ON public.optimized_cvs FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.cvs WHERE cvs.id = optimized_cvs.cv_id AND cvs.user_id = auth.uid())
);

-- Policies for job_matches
CREATE POLICY "Users can view their own job matches" ON public.job_matches FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cvs WHERE cvs.id = job_matches.cv_id AND cvs.user_id = auth.uid())
);
CREATE POLICY "Users can create job matches for their own CVs" ON public.job_matches FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.cvs WHERE cvs.id = job_matches.cv_id AND cvs.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own job matches" ON public.job_matches FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.cvs WHERE cvs.id = job_matches.cv_id AND cvs.user_id = auth.uid())
);


-- ============================================
-- PROFILE INTEGRATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
