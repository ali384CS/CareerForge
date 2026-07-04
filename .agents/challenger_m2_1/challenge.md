# Adversarial Challenge & Verification Report: Milestone 2 (Fix session persistence)

**Overall risk assessment**: HIGH (due to build failure from ESLint errors and OAuth redirect race conditions)

---

## 1. Challenge & Verification Summary

We evaluated the Milestone 2 implementation focusing on session persistence, routing edge cases, TypeScript compilation, hydration issues, and build status.

- **Build Status**: **FAILED**. The command `npm run build` fails during the linting phase due to 19 ESLint errors (and 31 warnings) across the new components, existing landing page, Deno edge functions, and backup files.
- **Routing & Redirect Loops**: **PASS (with caveats)**. Core redirects between guest/authenticated pages function correctly. No infinite redirect loops were found. However, there is a race condition risk during OAuth callback handling.
- **Hydration / SSR vs CSR**: **PASS (with caveats)**. There are no React hydration mismatch warnings/errors due to proper initialization of auth states. However, the Navbar exhibits a layout flash (showing the logged-out state briefly before updating to the logged-in state).
- **Session Persistence & `localStorage`**: **PASS**. Centralized Supabase client configuration in `src/lib/supabase.ts` correctly enables token persistence, auto-refresh, and URL detection. `localStorage` is used correctly on the client side.

---

## 2. Detailed Challenges

### [High] Challenge 1: Build Fails due to ESLint Errors
- **Assumption challenged**: The project is ready for production build and compiles cleanly.
- **Attack scenario**: Running `npm run build` on a CI/CD pipeline or production environment fails because Next.js blocks build completion when ESLint errors are detected.
- **Blast radius**: Prevents deployment to production.
- **Vulnerabilities / Root Causes**:
  1. **Strict TypeScript Lints in New Code**: The new code contains multiple `@typescript-eslint/no-explicit-any` errors, unused variables, `@ts-ignore` statements, and mutable declarations (`let`) that aren't reassigned.
  2. **Unescaped Quotes in Landing Page**: `src/app/page.tsx` contains unescaped single quotes (`shouldn't` and `don't`).
  3. **Linter Scanning Backup and Edge Function Files**: `eslint.config.mjs` does not exclude the `v1_backup` or `supabase` directories. These directories contain non-Next.js-compliant code (Deno dependencies and plain JavaScript), causing ESLint to fail.
- **Mitigation**:
  1. Update `eslint.config.mjs` to ignore `supabase/**` and `v1_backup/**`.
  2. Fix the specific ESLint errors in the Next.js files (replace `any` with actual types or unknown, remove unused imports and variables, escape single quotes in `src/app/page.tsx`, and convert non-reassigned `let` to `const`).

### [Medium] Challenge 2: OAuth Redirect / Callback Race Condition
- **Assumption challenged**: Redirecting from a third-party OAuth provider (e.g. Google Login) back to `/dashboard` will seamlessly restore the user session.
- **Attack scenario**: When a user returns from Google OAuth, the URL contains a hash fragment containing the access token. The Supabase client parses this fragment asynchronously. In `src/app/dashboard/page.tsx`, the `checkAuth` hook runs synchronously on mount:
  ```typescript
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth");
    } else {
      setUser(session.user);
    }
  };
  ```
  If `getSession()` runs and returns `null` *before* the Supabase client completes parsing the token from the URL hash, the user is redirected immediately back to `/auth`.
- **Blast radius**: OAuth flow breaks, rendering it impossible for users to sign in using Google.
- **Mitigation**:
  1. Instead of immediately redirecting to `/auth` on a `null` session, wait a short period or use `onAuthStateChange` to listen for the initial session load.
  2. Introduce a dedicated `/auth/callback` route to handle the URL exchange securely before redirecting to `/dashboard`.

### [Low] Challenge 3: Navbar Layout Flash (Logged-out state shown initially)
- **Assumption challenged**: The navigation bar displays the correct authentication status seamlessly on load.
- **Attack scenario**: When an authenticated user visits any page, `Navbar.tsx` initializes `user` state to `null`.
  ```typescript
  const [user, setUser] = useState<any>(null);
  ```
  The component immediately renders the logged-out state ("Sign Up / Log In" button, and hides "Dashboard" / "Find Jobs" links). After hydration, the `useEffect` async check completes, updating `user` to the session's user, which causes the UI to suddenly shift and swap buttons.
- **Blast radius**: Jarring user experience and layout shifts (CLS).
- **Mitigation**:
  Introduce a `loading` state in the Navbar. Show a skeleton loading pulse (e.g., `<div className="h-8 w-20 animate-pulse bg-slate-800/50 rounded-full"></div>`) while checking the session to maintain layout height and structure.

---

## 3. Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Run production build | Succeeded compilation and static export | Fails during `next build` due to ESLint check | **FAIL** |
| Run TypeScript compiler | Compiles with no type errors | Compiles with no errors (`npx tsc --noEmit` exits with 0) | **PASS** |
| Visit `/auth` while logged in | Redirects immediately to `/dashboard` | Redirects to `/dashboard` with spinner overlay | **PASS** |
| Visit `/dashboard` while logged out | Redirects to `/auth` | Redirects to `/auth` with verification spinner | **PASS** |
| Refresh `/dashboard` while logged in | Remains on `/dashboard`, session persists | Remains on `/dashboard`, spinner shown during check | **PASS** |
| Verify `localStorage` is used | Token stored in `localStorage` under `sb-...-auth-token` | Token persists in client `localStorage` | **PASS** |
| SSR and Hydration match | No console errors or mismatch warnings | Complies with no React hydration warnings | **PASS** |

---

## 4. Unchallenged Areas

- **Supabase Backend / Edge Functions**: The deployment and run-time behavior of Edge Functions (`analyze-cv`, `optimize-cv`, `generate-cv`) were not challenged or stress-tested since they require database connection setup and API credentials which are out of scope for this frontend verification milestone.
- **JSearch Integration**: The network-level availability of the external job search API was not tested as it is restricted in the runner sandbox.
