/**
 * ============================================
 * CV OPTIMIZER — CONFIGURATION
 * ============================================
 * 
 * ⚠️ REPLACE these placeholder values with your actual Supabase credentials.
 * See config.example.js for instructions on where to find these values.
 * 
 * This file is listed in .gitignore — do NOT commit it to version control.
 */

const SUPABASE_URL = 'https://jrglpmcfsptqsxjeeyuj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2xwbWNmc3B0cXN4amVleXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTU3NzksImV4cCI6MjA5ODQ3MTc3OX0.5YkUOshumNXfxcLa5uS1wWaMeLfej0Qi9o9hx7uXfXo';

/**
 * Edge Function base URL — automatically derived from SUPABASE_URL
 */
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;
