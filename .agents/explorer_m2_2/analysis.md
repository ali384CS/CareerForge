# Detailed Analysis Report: Session Persistence (R1)

## Summary of Core Findings
The session persistence bug is caused by duplicate module-level initializations of the Supabase client across multiple files without explicit storage/persistence settings. During Next.js pre-rendering (SSR), this module-level initialization runs in a non-browser environment where `window` and `localStorage` are undefined, resulting in an in-memory session fallback that breaks persistence on subsequent client-side page reloads.

---

## 1. Current Supabase Client Initializations
We identified four separate occurrences of Supabase client initialization in the codebase. All of them redundantly fetch environment variables and construct a new client without any configuration options.

### File Locations and Code Snippets

#### A. `src/components/Navbar.tsx` (Lines 8-11)
```typescript
// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### B. `src/app/auth/page.tsx` (Lines 7-9)
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### C. `src/app/dashboard/page.tsx` (Lines 8-10)
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### D. `src/app/jobs/page.tsx` (Lines 7-9)
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 2. Current Session Check and Redirect Logic
The session check is executed inside client-side `useEffect` hooks across protected pages, but there is an inconsistency in how loading states are handled and a total omission of the check on the auth page.

### Protected Pages

#### `src/app/dashboard/page.tsx` (Lines 29-39)
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
- **Loading State:** If `user` is null, the component returns `Loading...` (line 280):
  ```typescript
  if (!user) return <div className="p-8 text-center">Loading...</div>;
  ```
- **Analysis:** This shows a text-based loading state while the authentication check is in progress, which successfully prevents flashing protected content.

#### `src/app/jobs/page.tsx` (Lines 18-59)
```typescript
  useEffect(() => {
    const checkAuthAndFetchJobs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      setUser(session.user);
      // Fetch jobs logic...
```
- **Loading State:** If `user` is null, the component returns `null` (line 61):
  ```typescript
  if (!user) return null;
  ```
- **Analysis:** Returning `null` displays a blank page during the session check. This avoids flashing the jobs page UI, but it lacks a visual loading indicator (e.g., spinner) for the user, resulting in a suboptimal user experience.

### Guest-Only Pages

#### `src/app/auth/page.tsx`
- **Current State:** No session check on page load exists. 
- **Analysis:** If an already authenticated user navigates to `/auth`, they are shown the login/signup form instead of being automatically redirected to `/dashboard`.

---

## 3. Root Cause of Session Loss
1. **No Explicit Persistence Config:** The Supabase client is initialized using `createClient(url, key)` without explicit options.
2. **Next.js SSR Hydration Behavior:** Next.js pre-renders client components on the server. When pre-rendering `Navbar`, `AuthPage`, `Dashboard`, and `JobsPage`, Next.js evaluates the module scope. Because `window` and `localStorage` are undefined on the server, Supabase's internal storage fallback assigns an in-memory storage.
3. **Hydration Reuse:** During hydration on the client side, the module-level client instance has already been evaluated and instantiated. Since the in-memory storage was used, it does not query `localStorage` for the persisted session, causing the frontend to treat the user as unauthenticated on every page refresh.

---

## 4. Recommendations

### Recommendation 1: Centralize Supabase Client in `src/lib/supabase.ts`
We recommend creating a centralized Supabase client file at `src/lib/supabase.ts` with explicit configurations to force session persistence, automatic token refreshes, and URL session detection.

#### Proposed Content for `src/lib/supabase.ts`
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables in .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

### Recommendation 2: Update Pages to Use the Centralized Client
Replace the duplicate local Supabase initialization in:
- `src/components/Navbar.tsx`
- `src/app/auth/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/jobs/page.tsx`

with:
```typescript
import { supabase } from "@/lib/supabase";
```

### Recommendation 3: Refactor Page-Level Auth Checking and Loading States

#### A. Auth Page (`src/app/auth/page.tsx`)
Add a session check on load. If a session exists, redirect to `/dashboard`. Show a loading spinner during this check.

**Proposed Changes:**
```typescript
// Add these imports and state
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Inside AuthPage component:
const [checkingSession, setCheckingSession] = useState(true);

useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push("/dashboard");
    } else {
      setCheckingSession(false);
    }
  };
  checkAuth();
}, [router]);

if (checkingSession) {
  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

#### B. Dashboard Page (`src/app/dashboard/page.tsx`)
Keep the redirect logic but import `supabase` from the central configuration. Use a loading spinner instead of plain text "Loading..." to match the UI guidelines.

**Proposed Changes:**
```typescript
// Replace lines 8-10 with:
import { supabase } from "@/lib/supabase";

// Update line 280 from:
// if (!user) return <div className="p-8 text-center">Loading...</div>;
// To:
if (!user) {
  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

#### C. Jobs Page (`src/app/jobs/page.tsx`)
Update `jobs/page.tsx` to return a unified spinner while `user` is null.

**Proposed Changes:**
```typescript
// Replace lines 7-9 with:
import { supabase } from "@/lib/supabase";

// Update line 61 from:
// if (!user) return null;
// To:
if (!user) {
  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}
```
