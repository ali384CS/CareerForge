# Project: CVOptimizer Platform

## Architecture
- **Frontend**: Next.js 16 (App Router, TypeScript), Tailwind CSS v4, jsPDF for PDF export, mammoth.js for DOCX extraction (via CDN/browser).
- **Backend / Database**: Supabase (Auth, Storage, Database tables).
- **Serverless / Edge Functions**:
  - `analyze-cv`: custom NLP ATS scoring and keyword analysis.
  - `optimize-cv`: rule-based CV optimizer using strong verbs and spacing.
  - `generate-cv` (New): Edge Function to generate an ATS-optimized CV from structured form input.
- **Third-Party APIs**: JSearch (RapidAPI) for job search queries.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup & Verification Check | Run initial build/tests, check environment and config. | None | DONE |
| 2 | Fix session persistence (R1) | Centralize Supabase client initialization with persistSession, check session on load with loading spinner. | M1 | DONE |
| 3 | Fix ATS scoring (R2) | Update `analyze-cv` Edge Function to read and score based on CV text & job description. Remove hardcoding. | M1 | IN_PROGRESS |
| 4 | Fix file upload (R3) | Support `.docx` extraction using mammoth.js, add cancel button to clear file input. | M1 | PLANNED |
| 5 | Fix CV optimization (R4) | Incorporate `job_description` into `optimize-cv` function logic and POST payload. | M1 | PLANNED |
| 6 | Fix CV formatting (R5) | Implement and style `formatCVText()` helper for preview and PDF export. | M1 | PLANNED |
| 7 | Fix job matching (R6) | Parallel JSearch queries with timeout, fallbacks, loading progress text, masonry grid. | M1 | PLANNED |
| 8 | Fix UI/UX issues (R7) | Clean up Navbar, add smooth scroll CSS, fix Dashboard loading. | M2 | PLANNED |
| 9 | Add CV Builder page (R8) | Standalone form at `/cv-builder` page, new Edge Function `generate-cv`, preview and download. | M2, M5, M6 | PLANNED |
| 10 | Final E2E Audit & Handoff | Run final verifications for all bug fixes and features. | M2-M9 | PLANNED |

## Interface Contracts
### `analyze-cv` Edge Function
- **Endpoint**: POST `/functions/v1/analyze-cv`
- **Request Headers**: `Authorization: Bearer <JWT>`
- **Request Body**: `{ cv_text: string, job_description?: string }`
- **Response**: `{ success: true, ats_score: number, keywords_found: string[], keywords_missing: string[], suggestions: string[], overall_feedback: string }`

### `optimize-cv` Edge Function
- **Endpoint**: POST `/functions/v1/optimize-cv`
- **Request Headers**: `Authorization: Bearer <JWT>`
- **Request Body**: `{ cv_text: string, job_description?: string }`
- **Response**: `{ success: true, optimized_cv_text: string, changes_made: string[] }`

### `generate-cv` Edge Function (New)
- **Endpoint**: POST `/functions/v1/generate-cv`
- **Request Headers**: `Authorization: Bearer <JWT>`
- **Request Body**: `{ full_name: string, email: string, phone: string, linkedin?: string, github?: string, summary: string, education: Array<{ degree: string, institution: string, year: string }>, skills: string[], experience: Array<{ title: string, date: string, description: string[] }>, languages: string[], job_description?: string }`
- **Response**: `{ success: true, optimized_cv_text: string }`

## Code Layout
- `src/components/Navbar.tsx`: Global navigation header
- `src/lib/supabase.ts` (Planned): Shared Supabase client config
- `src/app/page.tsx`: Landing page
- `src/app/auth/page.tsx`: Login/Signup view
- `src/app/dashboard/page.tsx`: Core CV upload, analysis, optimization and preview page
- `src/app/jobs/page.tsx`: Matching jobs masonry view
- `src/app/api/jobs/route.ts`: Secure API endpoint connecting to JSearch
- `src/app/cv-builder/page.tsx` (Planned): Standalone CV builder form and preview
- `supabase/functions/`: Serverless Edge Functions (Deno)
- `supabase/migrations.sql`: SQL tables and database configuration
