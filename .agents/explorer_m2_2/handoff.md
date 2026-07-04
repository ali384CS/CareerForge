# Handoff Report: Fix Session Persistence (Milestone 2)

This report details the investigation into session persistence issues (R1) in the CVOptimizer Next.js platform.

---

## 1. Observation

### A. Redundant Supabase Client Initialization
Supabase client is initialized locally in four separate files:
1. **`src/components/Navbar.tsx` (Lines 8-11):**
   ```typescript
   // Initialize Supabase client
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
   const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```
2. **`src/app/auth/page.tsx` (Lines 7-9):**
   ```typescript
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
   const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```
3. **`src/app/dashboard/page.tsx` (Lines 8-10):**
   ```typescript
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
   const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```
4. **`src/app/jobs/page.tsx` (Lines 7-9):**
   ```typescript
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
   const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

### B. Current Page-Level Auth Checking & Loading States
1. **`src/app/dashboard/page.tsx` (Lines 29-39, 280):**
   ```typescript
   useEffect(() => {
     const checkAuth = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         router.push("/auth");
       } else {
         setUser(session.user);
       }
     };
     checkAuth();
   }, [router]);
   ```
   If `user` is not loaded yet, the render logic is:
   ```typescript
   if (!user) return <div className="p-8 text-center">Loading...</div>;
   ```

2. **`src/app/jobs/page.tsx` (Lines 18-26, 61):**
   ```typescript
   useEffect(() => {
     const checkAuthAndFetchJobs = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         router.push("/auth");
         return;
       }
       setUser(session.user);
       // ...
   ```
   If `user` is not loaded yet, the render logic is:
   ```typescript
   if (!user) return null;
   ```

3. **`src/app/auth/page.tsx`:**
   - No `checkAuth` or `getSession()` call on page load. Already authenticated users remain on the login page.

---

## 2. Logic Chain

1. **Observations 1, 2, 3, and 4** show that the Supabase client is initialized at the module level in each file using `createClient(supabaseUrl, supabaseAnonKey)` with no configuration object.
2. Because these are client-side page components pre-rendered on the server (Next.js App Router SSR), the module-level code is executed on the server first.
3. During server execution, `window` and `localStorage` are undefined. As a result, `@supabase/supabase-js` falls back to an in-memory session store.
4. During client hydration, Next.js reuses the already-evaluated module variables, keeping the client instance configured with the server-side in-memory session store. Therefore, the browser fails to read or write the auth session in `localStorage`, leading to the loss of session persistence on every page load/refresh.
5. **Observation B.3** shows that `auth/page.tsx` has no session-check logic on mount, meaning signed-in users are not automatically redirected to the dashboard.
6. **Observation B.2** shows that `jobs/page.tsx` returns `null` (blank screen) during session checks, which is a suboptimal user experience compared to a standardized loading spinner.

---

## 3. Caveats
- This investigation assumes that `window.localStorage` is the desired mechanism to persist sessions.
- No other OAuth provider callback logic was investigated, but the standard Supabase OAuth client flows will automatically work as long as the initialized client has session detection enabled (`detectSessionInUrl: true`).
- The `v1_backup` directory in the root is ignored for analysis.

---

## 4. Conclusion
To resolve the session persistence bug and eliminate auth flashes, we must:
1. Centralize the Supabase client initialization in a single file `src/lib/supabase.ts`, passing explicit configuration options: `{ auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }`.
2. Update all client-side pages to import the centralized client.
3. Implement a loading state check and automatic redirect to `/dashboard` inside `src/app/auth/page.tsx` for already-authenticated users.
4. Replace the blank loading screens (`return null` or plain `Loading...` text) on protected pages with a unified spinner component.

---

## 5. Verification Method

### A. Direct Files Inspection
1. Confirm `src/lib/supabase.ts` exists and initializes the client with the required `auth` options.
2. Confirm `src/components/Navbar.tsx`, `src/app/auth/page.tsx`, `src/app/dashboard/page.tsx`, and `src/app/jobs/page.tsx` import `supabase` from `@/lib/supabase` and no longer contain `createClient` calls.

### B. Functional Verification (via browser devtools or script)
1. Run `npm run build` to ensure Next.js builds without any TypeScript or routing compilation errors.
2. Open the application, log in using email/password or Google OAuth.
3. Verify that a session item is stored in `localStorage` (check `localStorage.getItem("sb-<project-id>-auth-token")`).
4. Refresh the page on `/dashboard` and `/jobs`. Verify the page displays a loading spinner briefly, then shows the page contents without redirecting to `/auth`.
5. Navigate manually to `/auth` while logged in. Verify the page displays a loading spinner briefly and redirects back to `/dashboard`.
