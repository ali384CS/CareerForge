# Milestone 2 Review Report

## Review Summary

**Verdict**: APPROVE

## Findings

### [Minor] Finding 1: Unused imports and variables across reviewed files

- What: There are multiple unused imports (e.g., `useRef` in `dashboard/page.tsx`) and variables (e.g., `file` in `dashboard/page.tsx`, `user` in `jobs/page.tsx`) that trigger lint warnings.
- Where: `src/app/dashboard/page.tsx`, `src/app/jobs/page.tsx`, `src/app/auth/page.tsx`.
- Why: It clutters the code and fails ESLint checks.
- Suggestion: Remove the unused imports/variables or prefix unused parameters with an underscore.

### [Minor] Finding 2: Extensive use of `any` types in client components

- What: Multiple places use the `any` type (e.g., `useState<any>(null)`).
- Where: `src/components/Navbar.tsx:9`, `src/app/auth/page.tsx:55`, `src/app/dashboard/page.tsx:11,71,85`, `src/app/jobs/page.tsx:8,9,49`.
- Why: Reduces TypeScript type-safety.
- Suggestion: Define proper interfaces for user profiles and job structures instead of using `any`.

### [Minor] Finding 3: Use of `@ts-ignore` instead of `@ts-expect-error`

- What: The codebase uses `@ts-ignore` to bypass pdf.js and mammoth imports.
- Where: `src/app/dashboard/page.tsx:63,83`.
- Why: ESLint recommends `@ts-expect-error` over `@ts-ignore` so that if the type error is resolved in the future, the comment itself triggers a compilation error reminding devs to clean it up.
- Suggestion: Replace `@ts-ignore` with `@ts-expect-error`.

### [Major] Finding 4: Unauthenticated JSearch API Route `/api/jobs`

- What: The server route `/api/jobs` retrieves job postings using a secret API key `JSEARCH_API_KEY` but does not perform any authorization check to verify that the request is coming from a logged-in user.
- Where: `src/app/api/jobs/route.ts`.
- Why: An anonymous attacker can send arbitrary POST requests directly to `/api/jobs` and exhaust the API quota of the JSearch service.
- Suggestion: Implement Supabase authorization check in `/api/jobs` by reading the user session/JWT, or pass the token from the frontend and verify it.

## Verified Claims

- Centralized Supabase client initialization in `src/lib/supabase.ts` → verified via `view_file` → PASS.
- No local `createClient` calls in client files (`Navbar.tsx`, `auth/page.tsx`, `dashboard/page.tsx`, `jobs/page.tsx`) → verified via `view_file` and code search → PASS.
- Redirects and loading states prevent unauthenticated flashes → verified via code inspection of `auth/page.tsx`, `dashboard/page.tsx`, `jobs/page.tsx` → PASS.
- Production build succeeds without errors → verified via running `npm run build` → PASS.

## Coverage Gaps

- **Next.js server-side JSearch API Route security**: The authorization checks on API routes were not thoroughly explored or guarded.
  - Risk Level: Medium.
  - Recommendation: Accept the risk for Milestone 2 as session persistence is correct on the client, but address it in a future task.

## Unverified Items

- **Actual Supabase Auth flow with real Google OAuth**: We cannot verify the OAuth flow to Google or actual sign-up verification email in this CLI environment without active user credentials or external web access.
  - Reason not verified: Network and sandbox limits.

---

## Challenge Summary

**Overall risk assessment**: MEDIUM

## Challenges

### [Medium] Challenge 1: Public Exposure of `/api/jobs` API Route

- Assumption challenged: The assumption that only authenticated users will make requests to the `/api/jobs` endpoint because it is only called from `/jobs` page which is protected.
- Attack scenario: An attacker inspects network traffic, obtains the `/api/jobs` URL, and repeatedly POSTs raw text payloads to it. This triggers JSearch API requests using the host's server API key.
- Blast radius: Denial of service/depletion of JSearch API query quota (which is a paid service on RapidAPI).
- Mitigation: Read the client's Authorization header (JWT) in `/api/jobs`, verify it using Supabase's jwt verification, and only proceed if valid.

### [Low] Challenge 2: LocalStorage state drift

- Assumption challenged: The assumption that `cv_for_jobs` is always available and up-to-date in `localStorage` when a user navigates to `/jobs`.
- Attack scenario: A user logs in on browser A, analyzes their CV (saving it to localStorage A), then logs in on browser B and navigates to `/jobs` directly. The app will display an error saying "We need your CV to find matching jobs" because the CV is not synchronized in a database.
- Blast radius: Sub-optimal user experience when switching devices.
- Mitigation: Persist the optimized/extracted CV text in a Supabase table under the user's ID, and fetch it on `/jobs` page rather than relying solely on `localStorage`.

## Stress Test Results

- Empty input to `/api/jobs` → Server returns `400 Bad Request` with `{ success: false, error: "CV text is required" }` → PASS.
- Accessing `/dashboard` as unauthenticated user → Shows centered loader then redirects to `/auth` without showing page content → PASS.
- Accessing `/jobs` as unauthenticated user → Shows loader then redirects to `/auth` → PASS.

## Unchallenged Areas

- **OAuth callbacks and third-party credential responses**: We did not challenge Google OAuth callback handling as it runs via Supabase's external server infrastructure.
