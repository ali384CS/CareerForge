/**
 * ============================================
 * CV OPTIMIZER — CONFIGURATION (EXAMPLE)
 * ============================================
 * 
 * INSTRUCTIONS:
 * 1. Copy this file and rename it to "config.js"
 * 2. Replace the placeholder values below with your actual Supabase credentials
 * 3. NEVER commit config.js to version control (it's in .gitignore)
 * 
 * WHERE TO FIND THESE VALUES:
 * - Go to https://supabase.com → Your Project → Settings → API
 * - "Project URL" = SUPABASE_URL
 * - "anon public" key = SUPABASE_ANON_KEY
 * 
 * ⚠️ SECURITY NOTE:
 * - Only use the "anon" key here — NEVER the "service_role" key
 * - The service_role key goes in Supabase Edge Function environment variables only
 */

const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

/**
 * Edge Function base URL
 * This is your Supabase project URL + /functions/v1/
 * Used to call backend Edge Functions from the frontend
 */
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;
