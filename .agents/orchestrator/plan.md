# Execution Plan

This plan details the steps required to resolve the 7 bugs and implement the 1 new feature for CVOptimizer Platform.

## Milestones

### Milestone 1: Setup & Initial Verification Check
- **Task**: Check environment variables, verify Next.js application builds without errors, check Supabase credentials.
- **Verification**: Run `npm run build` or `npm run lint` and verify success.

### Milestone 2: Fix session persistence (R1)
- **Task**: 
  - Create a centralized Supabase client at `src/lib/supabase.ts` with `{ auth: { persistSession: true, autoRefreshToken: true } }`.
  - Update `src/components/Navbar.tsx`, `src/app/auth/page.tsx`, `src/app/dashboard/page.tsx`, and `src/app/jobs/page.tsx` to import the centralized client.
  - Implement a loading state in `dashboard/page.tsx` and `jobs/page.tsx` while checking session, calling `supabase.auth.getSession()` BEFORE redirect checks.
- **Verification**: Refreshing page stays logged in. Spinner shown.

### Milestone 3: Fix ATS scoring (R2)
- **Task**:
  - Update `supabase/functions/analyze-cv/index.ts` to parse `job_description` from request body.
  - Modify scoring logic to incorporate overlap with job description (e.g. matching keywords from job description).
  - Verify that different CVs and job descriptions calculate different scores.
- **Verification**: Run verify scripts. Check if score changes.

### Milestone 4: Fix file upload — support DOCX & add cancel button (R3)
- **Task**:
  - Ensure file input in `src/app/dashboard/page.tsx` accepts `.pdf,.docx`.
  - Incorporate mammoth.js library text extraction inside `extractTextFromFile`.
  - Add an 'X' cancel button next to the filename when a file is selected.
  - Clicking 'X' clears selected file and resets input.
- **Verification**: Upload docx, verify extraction. Click cancel, verify state reset.

### Milestone 5: Fix CV optimization to use job description (R4)
- **Task**:
  - Confirm `job_description` is present in the POST body sent to `optimize-cv`.
  - Update `supabase/functions/optimize-cv/index.ts` to use `job_description` (if provided) to adapt the text (e.g., inject job-specific keywords, adjust summary/skills).
- **Verification**: Test same CV with two JDs, verify different optimized text.

### Milestone 6: Fix optimized CV formatting in preview (R5)
- **Task**:
  - Implement a robust `formatCVText(rawText)` helper.
  - Strip markdown artifacts (`##`, `**`).
  - Fix broken hyphens (e.g., "ali - mahmood" to "ali-mahmood", and in urls/slugs).
  - Detect ALL CAPS headers and wrap in `<h2>`.
  - Detect bullet lines and wrap in `<ul><li>`.
  - Ensure single blank line between sections.
  - Render with serif font, clear headers, spaced bullets.
- **Verification**: Visually verify layout of optimized CV preview.

### Milestone 7: Fix job matching feature (R6)
- **Task**:
  - Update `src/app/api/jobs/route.ts` to add a 15-second timeout per API fetch.
  - Parallelize job searches using `Promise.all`.
  - Add broader fallbacks if initial search returns empty results.
  - In `src/app/jobs/page.tsx`, show detailed progress text during loading.
  - Ensure Pinterest-style masonry grid layout CSS works correctly.
- **Verification**: Query jobs, verify it returns results within 20s and renders in grid.

### Milestone 8: Fix UI/UX issues (R7)
- **Task**:
  - Clean up `Navbar.tsx` by removing "About Us" and "Menu". Keep only required links.
  - Add `html { scroll-behavior: smooth; }` in `src/app/globals.css`.
  - Optimize/cache session data in dashboard routing to prevent delays.
- **Verification**: Verify navbar links, check smooth scrolling, verify snappy loading.

### Milestone 9: New Feature: CV Builder page (R8)
- **Task**:
  - Create `/cv-builder/page.tsx` with a structured form containing all required sections.
  - Add "Generate CV" button which calls a new Edge Function `generate-cv` (or handles it locally if suitable, but instructions say: "Generate CV button sends form data to a new Edge Function (generate-cv) that builds an ATS-optimized CV...").
  - Create the Deno Edge Function at `supabase/functions/generate-cv/index.ts`.
  - Output should render in the same CV preview component and support PDF download.
- **Verification**: Fill form, generate CV, check preview, download PDF, verify JD customization.

### Milestone 10: Final E2E Audit
- **Task**: Run a comprehensive audit of all requirements, ensuring passing build, tests, and clean security audit.
- **Verification**: Run Forensic Auditor.
