# Original User Request

## Initial Request — 2026-07-01T11:24:58Z

A production-grade web platform that helps job seekers (especially students) upload their CV, get it analyzed and optimized for ATS compatibility, optionally tailor it to a specific job description, and get matched to real job/internship listings with skill gap analysis — all without requiring a job description upfront.

Working directory: d:\Jobhunt
Integrity mode: development

## Requirements

### R1. Core Web Application
Build a responsive, visually polished multi-page web application using HTML, CSS, and vanilla JavaScript (no frameworks). The app must include:
- Landing page: Hero section with CTA, feature highlights (CV Analysis, CV Optimization, Job Matching), how-it-works flow, testimonials section, and footer.
- Authentication page: Login/Signup with email+password and Google OAuth via Supabase Auth. Redirect authenticated users to dashboard.
- Dashboard (protected): CV upload (drag-and-drop + file picker, PDF/DOCX only, max 5MB), optional job description textarea, ATS score display (animated progress indicator), keyword analysis, optimization suggestions, optimized CV preview with download, and matched job cards (title, company, match %, skill gaps).
- History page (protected): Table of past CV uploads with date, ATS score, and link to view results.
All pages must be mobile-responsive and feel premium. No placeholder images — generate or use real assets.

### R2. Supabase Backend
Use Supabase (free tier) for authentication, database, storage, and serverless functions:
- Auth: Email/password signup/login + Google OAuth
- Database: PostgreSQL tables to store user profiles, uploaded CVs, optimized CV results, and job match results.
- Storage: A bucket for CV file uploads with per-user access control
- Row Level Security: All tables must have RLS enabled so users can only access their own data
- Edge Functions (Deno/TypeScript): Three serverless functions that handle CV analysis, CV optimization, and job matching. All edge functions must verify the Supabase JWT before executing.
Provide clear setup instructions (SQL migration scripts and step-by-step Supabase console guide).

### R3. AI-Powered CV Analysis & Optimization
Using the Google Gemini API (gemini-2.5-flash):
1. CV Analysis: Accept extracted CV text, return an ATS compatibility score (0-100), found keywords, missing keywords, improvement suggestions, and overall feedback — all as structured JSON.
2. CV Optimization: Accept CV text + optional job description. If a JD is provided, tailor the CV to match JD keywords and requirements. If no JD, optimize generally for ATS. Return the optimized CV text and a list of changes made.
Both must run server-side (Supabase Edge Functions) with the Gemini API key stored as an environment variable. Include rate limiting (max 10 analysis requests per user per hour).

### R4. Job Matching via JSearch API
1. Use Gemini to extract the top 3 relevant job titles and key skills from the CV
2. Query the JSearch API (via RapidAPI) with those job titles to fetch real listings
3. For each listing, use Gemini to score the match (0-100) and identify specific skill gaps
4. Return results to the frontend as job cards with actionable skill gap recommendations

### R5. Security & Configuration
- All third-party API keys (Gemini, JSearch) and the Supabase service role key must be stored in Supabase Edge Function environment variables — never in frontend code
- Frontend uses only the Supabase anon key (stored in a config file, not hardcoded inline)
- All API calls to Gemini and JSearch route through Edge Functions
- RLS policies must prevent any cross-user data access
- Provide a config.example.js showing all required configuration values

### R6. Developer Setup Guide
Provide:
- A comprehensive README.md with step-by-step setup instructions
- SQL migration files that can be copy-pasted into Supabase SQL editor
- Clear comments throughout all code explaining what each section does
- A .env.example or equivalent showing all required environment variables

## Acceptance Criteria

### Authentication & Access Control
- [ ] A new user can sign up with email+password, receives confirmation, and can log in
- [ ] Google OAuth login works and creates a user profile
- [ ] Visiting the dashboard without authentication redirects to the auth page

### CV Upload & Storage
- [ ] User can upload a PDF file via drag-and-drop or file picker, and it is stored in Supabase Storage
- [ ] User can upload a DOCX file and it is stored correctly
- [ ] Uploading a file over 5MB shows an error message and is rejected
- [ ] Uploading a non-PDF/non-DOCX file shows an error message and is rejected
- [ ] A user cannot access another user's uploaded files

### CV Analysis
- [ ] After upload, the system extracts text and returns an ATS score between 0-100 that is displayed with an animated indicator
- [ ] The analysis returns at least 3 found keywords, at least 3 missing keywords, and at least 3 suggestions
- [ ] The edge function rejects requests without a valid JWT (returns 401)
- [ ] The 11th analysis request within an hour is rejected with a rate limit message

### CV Optimization
- [ ] Submitting a CV without a job description returns an optimized version with general ATS improvements
- [ ] Submitting a CV with a job description returns a version tailored to that JD's keywords
- [ ] The optimized CV can be downloaded as a text file

### Job Matching
- [ ] After CV analysis, the system returns at least 3 real job listings from JSearch with titles, companies, and URLs
- [ ] Each job card shows a match score (0-100) and at least one identified skill gap

### UI/UX Quality
- [ ] All pages are responsive and usable on mobile (320px viewport) and desktop (1440px viewport)
- [ ] Loading spinners are shown during all async operations
- [ ] All error states show user-friendly messages

### Security
- [ ] No API keys (Gemini, JSearch, service_role) appear in any frontend JavaScript file
- [ ] All Gemini and JSearch API calls are made from Edge Functions

### Developer Experience
- [ ] README.md contains complete setup instructions from zero to running locally
- [ ] SQL migration scripts can be copy-pasted into Supabase SQL editor and execute without errors

## Follow-up — 2026-07-03T05:50:07Z

# CVOptimizer Platform — Bug Fixes & CV Builder Feature

Fix 7 bugs and add 1 new feature to an existing Next.js 16 CV optimization platform. The platform uses Supabase for authentication and backend Edge Functions, and JSearch (RapidAPI) for job matching. This is a Final Year University Project demo.

Working directory: d:\Jobhunt
Integrity mode: development

**Technology stack already in use:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Supabase (Auth + Edge Functions + Storage), jsPDF for PDF export, JSearch via RapidAPI.

**Critical constraint:** Do NOT break any currently working functionality. Fix issues one at a time and verify each before moving to the next.

## Requirements

### R1. Fix session persistence
User is asked to log in on every page load even when already authenticated. Supabase client must persist session to localStorage. On every page load, call `supabase.auth.getSession()` BEFORE deciding to show login screen. Only redirect to login if getSession() returns null. Add a loading state while session is being checked so users don't flash-see the login screen. Ensure Supabase client is initialized with `{ auth: { persistSession: true, autoRefreshToken: true } }`.

### R2. Fix ATS scoring
ATS score is hardcoded to 66 and does not change with different CVs or job descriptions. Find and remove the hardcoded value. The custom NLP scoring algorithm must receive the current CV text and job description as input each time. Score must recalculate on every "Analyze & Optimize" click based on keyword match count, keyword density, and job description overlap (if provided).

### R3. Fix file upload — support DOCX and add cancel button
Currently only PDF files are accepted. Update file input to accept `.pdf,.docx`. Add DOCX text extraction using mammoth.js (already loaded via CDN). Add a visible "X" cancel button next to the uploaded file name. Clicking X clears the selected file, resets the file input, and returns UI to empty upload state.

### R4. Fix CV optimization to use job description
Changing the job description textarea does not change the optimization output. Confirm the `job_description` field is included in the POST body sent to optimize-cv Edge Function. Confirm the Edge Function uses it when present. Same CV with 2 different job descriptions must produce 2 different optimized outputs.

### R5. Fix optimized CV formatting in preview
Output has broken hyphens ("ali - mahmood"), no line breaks, sections run together, bullets merge into paragraphs. Build/fix a `formatCVText(rawText)` function that: strips markdown artifacts (## and **), fixes broken hyphens in URLs/slugs, detects ALL CAPS section headers and wraps in `<h2>`, detects bullet lines and wraps in `<ul><li>`, ensures single blank line spacing between sections. Render with proper CSS (serif font, clear headers, spaced bullets — resume-style).

### R6. Fix job matching feature
The Find Jobs feature is slow and returns "not found." A Next.js API route already exists at `src/app/api/jobs/route.ts` using the JSearch API key from `.env.local`. Fix the route to: add a 15-second timeout per API call, run job title searches in parallel (`Promise.all`), try broader fallback queries if initial search returns zero results, show a loading state with progress text. The frontend Jobs page at `src/app/jobs/page.tsx` uses a Pinterest-style masonry layout — ensure it renders correctly.

### R7. Fix UI/UX issues
A) Navbar: remove nav links that don't lead to working pages. Keep only: Home, Dashboard, Find Jobs, CV Builder (new from R8), user email, Log Out. Remove "About Us" and "Menu" if they have no real content pages.
B) Smooth scrolling: add `html { scroll-behavior: smooth; }` globally. Ensure no layout-shift causing janky scroll.
C) Dashboard navigation: investigate and fix slow navigation to Dashboard. Cache session/CV data in memory where possible.

### R8. New feature: CV Builder page
Create a new standalone page at `/cv-builder` linked in the navbar as "CV Builder." Include a structured form with fields: Full Name, Email, Phone, LinkedIn, GitHub, Professional Summary, Education (repeatable: degree, institution, year), Skills (comma-separated or tag input), Work/Project Experience (repeatable: title, date, description bullets), Languages. Include an optional "Target Job Description" textarea. "Generate CV" button sends form data to a new Edge Function (`generate-cv`) that builds an ATS-optimized CV using the same strict formatting rules as R5. Output renders in the same formatted CV preview component (reuse `formatCVText()`). Include the same PDF download functionality (reuse jsPDF export). This is a fully separate flow from the optimizer — do not merge them.

## Verification

The agent team must create and run verification scripts/checks for each requirement:

### Verification for R1 (Session)
- Script that confirms: after login, refreshing the page does NOT redirect to login
- Verify `supabase.auth.getSession()` is called before any redirect logic
- Confirm a loading spinner/state is shown during session check

### Verification for R2 (ATS Score)
- Search codebase for any hardcoded score values (grep for "66", "setAtsScore(66)", etc.)
- Confirm the analyze endpoint receives different CV texts and returns different scores
- Test: submit two different CV texts and verify two different scores are returned

### Verification for R3 (File Upload)
- Confirm file input `accept` attribute includes `.docx`
- Confirm a cancel/remove button exists in the upload UI
- Verify clicking cancel resets the file state

### Verification for R4 (Job Description)
- Confirm `job_description` is present in the POST body sent to optimize-cv
- Verify the Edge Function code branches on `job_description` presence

### Verification for R5 (Formatting)
- Confirm `formatCVText()` function exists and handles: markdown stripping, heading detection, bullet formatting
- Visually verify the preview renders with proper structure (no raw text dump)

### Verification for R6 (Job Matching)
- Confirm `/api/jobs/route.ts` has a timeout mechanism
- Confirm parallel fetching is used (Promise.all or equivalent)
- Test the endpoint returns valid job data

### Verification for R7 (UI/UX)
- Confirm navbar only contains links to real pages
- Confirm `scroll-behavior: smooth` is in global CSS
- Navigate between pages and confirm no excessive loading delays

### Verification for R8 (CV Builder)
- Confirm `/cv-builder` page exists and is accessible
- Confirm form has all required fields
- Confirm "Generate CV" button produces formatted output
- Confirm PDF download works from the CV Builder page
- Confirm optional job description field tailors the generated CV when provided

## Acceptance Criteria

### Session Persistence
- [ ] User stays logged in after page refresh — no re-login required
- [ ] Loading state shown during session check — no flash of login screen

### ATS Scoring
- [ ] No hardcoded score values exist in the codebase
- [ ] Two different CVs produce two different ATS scores
- [ ] Adding a job description changes the score compared to no job description

### File Upload
- [ ] Both .pdf and .docx files can be uploaded and text is extracted
- [ ] Cancel button is visible and resets the upload state when clicked

### Job Description Integration
- [ ] Same CV with two different job descriptions produces two different optimized outputs

### CV Formatting
- [ ] Optimized CV preview shows proper headings, bullets, and section spacing
- [ ] No broken hyphens, no raw markdown artifacts in the preview

### Job Matching
- [ ] Clicking "Find Matching Jobs" returns real job listings within 20 seconds
- [ ] Jobs display in the masonry grid layout with title, company, and apply link

### UI/UX
- [ ] Navbar contains only links to working pages (Home, Dashboard, Find Jobs, CV Builder, auth)
- [ ] Page scrolling is smooth with no jank or layout shift

### CV Builder
- [ ] `/cv-builder` page loads with a structured form
- [ ] Filling out the form and clicking "Generate CV" produces a formatted CV preview
- [ ] PDF download works from the CV Builder page
- [ ] Optional job description field tailors the generated CV when provided
