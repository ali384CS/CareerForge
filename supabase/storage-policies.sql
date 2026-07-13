-- ============================================
-- CV OPTIMIZER — STORAGE BUCKET SETUP
-- ============================================
-- 
-- HOW TO USE:
-- 1. Go to your Supabase Dashboard → SQL Editor
-- 2. Click "New Query"  
-- 3. Paste this entire file
-- 4. Click "Run"
-- 
-- This creates the "cv-uploads" storage bucket and sets up
-- security policies so:
-- - Only authenticated users can upload files
-- - Users can only read/delete their own files
-- ============================================


-- Create the storage bucket for CV uploads
-- Setting public = false means files require authentication to access
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-uploads', 'cv-uploads', false)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Policy: Authenticated users can upload files to their own folder
-- Files are stored as: {user_id}/{timestamp}_{filename}
-- This policy checks that the first folder in the path matches the user's ID
DROP POLICY IF EXISTS "Users can upload their own CVs" ON storage.objects;
CREATE POLICY "Users can upload their own CVs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'cv-uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can only read (download) their own files
DROP POLICY IF EXISTS "Users can read their own CVs" ON storage.objects;
CREATE POLICY "Users can read their own CVs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'cv-uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can delete their own files
DROP POLICY IF EXISTS "Users can delete their own CVs" ON storage.objects;
CREATE POLICY "Users can delete their own CVs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'cv-uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can update (overwrite) their own files
DROP POLICY IF EXISTS "Users can update their own CVs" ON storage.objects;
CREATE POLICY "Users can update their own CVs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'cv-uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'cv-uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
