-- ============================================
-- CV OPTIMIZER — DATABASE MIGRATION SCRIPT
-- ============================================
-- 
-- HOW TO USE:
-- 1. Go to your Supabase Dashboard → SQL Editor
-- 2. Click "New Query"
-- 3. Paste this entire file
-- 4. Click "Run" (or Ctrl+Enter)
-- 
-- This script creates all the tables, enables Row Level Security,
-- and sets up access policies so users can only see their own data.
-- 
-- Run this ONCE when setting up the project. If you need to start fresh,
-- run the DROP statements at the bottom first.
-- ============================================


-- ============================================
-- TABLE 1: users
-- ============================================
-- Stores user profile information
-- Links to Supabase Auth's built-in auth.users table via the id column
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a comment describing the table
COMMENT ON TABLE public.users IS 'User profiles linked to Supabase Auth';


-- ============================================
-- TABLE 2: cvs
-- ============================================
-- Stores uploaded CV metadata and analysis results
-- Each CV belongs to one user (user_id)
CREATE TABLE IF NOT EXISTS public.cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_url TEXT,              -- URL to the file in Supabase Storage
    extracted_text TEXT,        -- Raw text extracted from the CV (PDF/DOCX)
    ats_score INTEGER,          -- ATS compatibility score (0-100)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON public.cvs(user_id);

COMMENT ON TABLE public.cvs IS 'Uploaded CVs with extracted text and ATS scores';


-- ============================================
-- TABLE 3: optimized_cvs
-- ============================================
-- Stores the optimized version of each CV
-- Links to the original CV via cv_id
-- job_description is nullable (null = optimized without a specific JD)
CREATE TABLE IF NOT EXISTS public.optimized_cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id UUID NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
    job_description TEXT,       -- The job description used for tailoring (NULL if none provided)
    optimized_text TEXT,        -- The AI-optimized CV content
    suggestions JSONB,          -- Array of improvement suggestions from the AI
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by CV
CREATE INDEX IF NOT EXISTS idx_optimized_cvs_cv_id ON public.optimized_cvs(cv_id);

COMMENT ON TABLE public.optimized_cvs IS 'AI-optimized versions of uploaded CVs';


-- ============================================
-- TABLE 4: job_matches
-- ============================================
-- Stores job matches found for each CV
-- Each match includes a relevance score and skill gap analysis
CREATE TABLE IF NOT EXISTS public.job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id UUID NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,    -- Title of the matched job
    company TEXT,               -- Company name
    job_url TEXT,               -- URL to the original job posting
    match_score INTEGER,        -- Match relevance score (0-100)
    skill_gaps JSONB,           -- Array of skills the candidate is missing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by CV
CREATE INDEX IF NOT EXISTS idx_job_matches_cv_id ON public.job_matches(cv_id);

COMMENT ON TABLE public.job_matches IS 'Job listings matched to uploaded CVs with skill gap analysis';


-- ============================================
-- ROW LEVEL SECURITY (RLS) — ENABLE ON ALL TABLES
-- ============================================
-- RLS ensures that users can ONLY access their own data.
-- Without RLS, any authenticated user could read/write ALL rows.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimized_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;


-- ============================================
-- RLS POLICIES — users table
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can create their own profile"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- ============================================
-- RLS POLICIES — cvs table
-- ============================================

-- Users can only see their own CVs
CREATE POLICY "Users can view their own CVs"
    ON public.cvs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert CVs under their own user_id
CREATE POLICY "Users can upload their own CVs"
    ON public.cvs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own CVs (e.g., adding ATS score after analysis)
CREATE POLICY "Users can update their own CVs"
    ON public.cvs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own CVs
CREATE POLICY "Users can delete their own CVs"
    ON public.cvs
    FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================
-- RLS POLICIES — optimized_cvs table
-- ============================================
-- Users can access optimized CVs that belong to their own CVs
-- We check ownership by joining through the cvs table

CREATE POLICY "Users can view their own optimized CVs"
    ON public.optimized_cvs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cvs
            WHERE cvs.id = optimized_cvs.cv_id
            AND cvs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create optimized CVs for their own CVs"
    ON public.optimized_cvs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cvs
            WHERE cvs.id = optimized_cvs.cv_id
            AND cvs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own optimized CVs"
    ON public.optimized_cvs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cvs
            WHERE cvs.id = optimized_cvs.cv_id
            AND cvs.user_id = auth.uid()
        )
    );


-- ============================================
-- RLS POLICIES — job_matches table
-- ============================================
-- Same pattern: users can only access job matches linked to their own CVs

CREATE POLICY "Users can view their own job matches"
    ON public.job_matches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cvs
            WHERE cvs.id = job_matches.cv_id
            AND cvs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create job matches for their own CVs"
    ON public.job_matches
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cvs
            WHERE cvs.id = job_matches.cv_id
            AND cvs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own job matches"
    ON public.job_matches
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cvs
            WHERE cvs.id = job_matches.cv_id
            AND cvs.user_id = auth.uid()
        )
    );


-- ============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================
-- This trigger automatically creates a row in the users table
-- whenever a new user signs up via Supabase Auth.
-- This way, the user profile is always in sync with auth.users.

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

-- Attach the trigger to auth.users so it fires on every new signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- OPTIONAL: DROP EVERYTHING (for starting fresh)
-- ============================================
-- ⚠️ UNCOMMENT these lines ONLY if you want to delete all tables and start over
-- 
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP TABLE IF EXISTS public.job_matches CASCADE;
-- DROP TABLE IF EXISTS public.optimized_cvs CASCADE;
-- DROP TABLE IF EXISTS public.cvs CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
