## 2026-07-03T06:41:46Z
You are worker_m2, a teamwork_preview_worker. Your working directory is d:\Jobhunt\.agents\worker_m2.

Your task is to implement Milestone 2: Fix session persistence (R1) in d:\Jobhunt.
Reference:
- Requirements are in d:\Jobhunt\.agents\ORIGINAL_REQUEST.md (specifically R1).
- Plan is in d:\Jobhunt\.agents\orchestrator\PROJECT.md.
- Consensus findings from explorers:
  - Centralize client initialization in src/lib/supabase.ts with `{ auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }`.
  - Update imports in src/components/Navbar.tsx, src/app/auth/page.tsx, src/app/dashboard/page.tsx, and src/app/jobs/page.tsx to import from @/lib/supabase.
  - Implement a loading state in dashboard/page.tsx, jobs/page.tsx, and auth/page.tsx while the session is being checked.
  - In auth/page.tsx, check if session is active. If so, redirect to /dashboard. While checking, show a loading spinner.

Step-by-Step Implementation Instructions:
1. Create src/lib/supabase.ts with the following content:
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

2. Update src/components/Navbar.tsx:
- Remove:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
- Add import: `import { supabase } from "@/lib/supabase";`

3. Update src/app/auth/page.tsx:
- Import `supabase` from `@/lib/supabase` instead of local initialization.
- Implement a `checkingAuth` state (defaulting to `true`).
- Inside a `useEffect`, call `supabase.auth.getSession()`. If a session exists, redirect to `/dashboard`. If not, set `checkingAuth` to `false`.
- If `checkingAuth` is true, render a beautiful loading spinner (centered screen Tailwind animation). Otherwise render the login/signup form.

4. Update src/app/dashboard/page.tsx:
- Import `supabase` from `@/lib/supabase`.
- Inside `useEffect`, call `supabase.auth.getSession()` and if session is null, redirect to `/auth`. If not, `setUser(session.user)`.
- Use a state or the `!user` check to display a loading spinner while authentication status is being checked on load. Replace the plain "Loading..." text with a styled Tailwind spinner.

5. Update src/app/jobs/page.tsx:
- Import `supabase` from `@/lib/supabase`.
- Ensure `supabase.auth.getSession()` is called on mount.
- While checking auth, show the Tailwind loading spinner instead of `return null;`.

6. Run the build command:
- Run `npm run build` from the root directory to verify there are no TypeScript or compilation errors.
- Include the build commands and output results in your handoff report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Produce:
- A progress file at d:\Jobhunt\.agents\worker_m2\progress.md updated at each major step.
- A handoff file at d:\Jobhunt\.agents\worker_m2\handoff.md detailing what was changed, build verification output, and how to verify.
Send a message back to the parent agent (conversation ID: 503e6216-cc64-4b65-8a96-bb7dcb0234f3) when done.
