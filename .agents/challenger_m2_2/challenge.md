# Adversarial Challenge and Verification Report

This report documents the verification, edge case testing, and stress-testing of Milestone 2: Fix session persistence (R1) in `d:\Jobhunt`.

## Challenge Summary

**Overall risk assessment**: HIGH (due to production build blocking)

While the session persistence and redirection logic are logically sound and free of infinite loops, the project fails to build for production because strict ESLint rules block the `next build` command. 

---

## Challenges

### [High] Build Failure due to Strict ESLint Checks
- **Assumption challenged**: The codebase can be successfully built for production using `npm run build`.
- **Attack scenario**: A deployment command is run (`npm run build`). Next.js executes ESLint checks during compile, which detects 19 errors and 31 warnings across multiple source files (e.g., explicit usage of `any` types, unescaped quotation marks in TSX elements, prefer-const violations, and `@ts-ignore` misuse). The compiler aborts, exiting with code 1.
- **Blast radius**: The application cannot be deployed to any production hosting provider (Vercel, Netlify, Docker, etc.) that runs a build check.
- **Mitigation**: 
  1. Fix the ESLint issues in the files (preferred).
  2. Alternatively, configure Next.js to ignore ESLint errors during builds in `next.config.ts` (e.g. `eslint: { ignoreDuringBuilds: true }`).

### [Medium] Script Loading Race Condition during Document Extraction
- **Assumption challenged**: External dependencies `pdf.js` and `mammoth` are fully loaded and initialized when a user attempts to extract text from a file.
- **Attack scenario**: If a user immediately uploads a PDF or DOCX file upon page load, before the lazy-loaded scripts (`strategy="lazyOnload"`) finish downloading from CDNJS, the extraction will crash. The code references `window['pdfjs-dist/build/pdf']` or `window.mammoth` which will be `undefined`, throwing a `TypeError: Cannot read properties of undefined` in the console.
- **Blast radius**: Extraction fails with a generic "Failed to extract text. Please try again." status message, leaving the user unable to proceed without refreshing or waiting.
- **Mitigation**: 
  1. Disable the upload input until the external scripts are loaded.
  2. Implement an explicit check for the existence of `window.pdfjsLib` and `window.mammoth` prior to calling them, displaying a friendly "Loading helper libraries, please wait..." indicator if they are not yet ready.

### [Low] Client-Side Redirection Latency
- **Assumption challenged**: Users are redirected immediately when attempting to access protected pages without a session.
- **Attack scenario**: If an unauthenticated user directly navigates to `/dashboard` or `/jobs`, the server returns the static HTML shell including the "Verifying session..." loading spinner. The client-side code must wait for page mount (`useEffect`) to run `supabase.auth.getSession()` and then invoke `router.push("/auth")`. 
- **Blast radius**: There is a brief visual flash of the loading spinner before redirection occurs, which is minor but slightly degrades user experience.
- **Mitigation**: Transition to using Next.js Middleware combined with Supabase SSR client for server-side redirection before rendering the page shell.

---

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Pass/Fail |
|---|---|---|---|
| **Visiting `/auth` when already logged in** | Redirects to `/dashboard` without loops. | `/auth` detect session, redirects to `/dashboard`. `/dashboard` detects session, user stays. | **PASS** |
| **Visiting `/dashboard` / `/jobs` when not logged in** | Redirects to `/auth` without loops. | `/dashboard` / `/jobs` detect no session, redirect to `/auth`. `/auth` detects no session, renders form. | **PASS** |
| **Verifying `localStorage` token storage** | Session token stored and retrieved automatically by Supabase. | Supabase client initialized with `persistSession: true`, using `localStorage` to save and read auth token. | **PASS** |
| **Running TS compiler type check (`npx tsc --noEmit`)** | No compile-time TypeScript errors. | Command finishes successfully with exit code 0. | **PASS** |
| **Running production build (`npm run build`)** | Application compiles and outputs static HTML. | Command fails with exit code 1 due to 19 ESLint errors. | **FAIL** |

---

## Unchallenged Areas

- **OAuth Google Integration Redirect URL**: We verified that Google OAuth references `${window.location.origin}/dashboard` which is correct, but we could not perform end-to-end verification of OAuth without active credentials and client interaction.
