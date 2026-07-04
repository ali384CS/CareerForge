# Analysis Report — Milestone 2: Fix Session Persistence (R1)

## Executive Summary
The codebase currently initializes separate Supabase client instances across four different files without explicit persistence settings, leading to session desynchronization, lost auth states, and a jarring user experience. Centralizing the Supabase client and implementing robust, state-backed auth checking with premium loading animations resolves these issues and eliminates the flash of the login screen.

---

## 1. Current Supabase Client Initializations
Each client-side page and component currently duplicates Supabase client creation at the module level. They all load environment variables individually and invoke `createClient` without configuring auth session options:

| File Path | Line Numbers | Initialization Snippet |
|-----------|--------------|-------------------------|
| `src/components/Navbar.tsx` | 8–11 | `const supabase = createClient(supabaseUrl, supabaseAnonKey);` |
| `src/app/auth/page.tsx` | 7–9 | `const supabase = createClient(supabaseUrl, supabaseAnonKey);` |
| `src/app/dashboard/page.tsx` | 8–10 | `const supabase = createClient(supabaseUrl, supabaseAnonKey);` |
| `src/app/jobs/page.tsx` | 7–9 | `const supabase = createClient(supabaseUrl, supabaseAnonKey);` |

### Key Issues Identified:
1. **Multiple Isolated Instances**: Running four distinct client instances in the same browser window causes state desynchronization. For example, logging in on the auth page updates one client instance, but the Navbar or Dashboard instances might not detect the storage/state change instantly.
2. **Missing Auth Configurations**: None of the client initializations define `persistSession: true` or `autoRefreshToken: true` inside an options object. Although the Supabase JS SDK defaults to true, lack of explicit centralization prevents enforcing uniform storage and auth behaviour.
3. **No Centralized Error Handling**: Environment variables are referenced inline with assertion operators (`!`), which could fail silently or produce unhelpful errors if env keys are missing.

---

## 2. Current Session Check and Redirect Logic
The redirect and auth checking logic on page load is implemented using client-side React `useEffect` hooks. It has major UX flaws described below:

### A. Dashboard (`src/app/dashboard/page.tsx`)
```typescript
29:   useEffect(() => {
30:     const checkAuth = async () => {
31:       const { data: { session } } = await supabase.auth.getSession();
32:       if (!session) {
33:         router.push("/auth");
34:       } else {
35:         setUser(session.user);
36:       }
37:     };
38:     checkAuth();
39:   }, [router]);
...
280:   if (!user) return <div className="p-8 text-center">Loading...</div>;
```
- **Flaw**: While checking the session, a simple plain-text `"Loading..."` is rendered. More importantly, during OAuth redirects, `getSession()` can execute and return `null` before the Supabase client handles the URL hash fragment, causing an accidental redirect back to `/auth`.

### B. Find Jobs Page (`src/app/jobs/page.tsx`)
```typescript
18:   useEffect(() => {
19:     const checkAuthAndFetchJobs = async () => {
20:       const { data: { session } } = await supabase.auth.getSession();
21:       if (!session) {
22:         router.push("/auth");
23:         return;
24:       }
25:       setUser(session.user);
...
61:   if (!user) return null;
```
- **Flaw**: If `user` is null (the initial mount state), the page returns `null` (rendering a blank white screen). Only after `checkAuthAndFetchJobs` resolves does it display the spinner/jobs. If the user is unauthenticated, they experience a jarring blank screen before being redirected.

### C. Auth Page (`src/app/auth/page.tsx`)
- **Flaw**: The `/auth` page has **no session checks** on load. If an already authenticated user navigates to `/auth`, they see the login/signup form instead of being immediately redirected to `/dashboard`. 

### D. Navbar (`src/components/Navbar.tsx`)
- **Flaw**: The Navbar renders links like "Dashboard" and "Find Jobs" only if `user` is non-null. However, since the session load is asynchronous, the Navbar initially renders the logged-out state ("Sign Up / Log In" button) on every page refresh before flipping to the logged-in state, causing layout shifts and visual flashing.

---

## 3. Recommendation 1: Centralize Supabase Client
Create a new file `src/lib/supabase.ts` that configures and exports a single, shared Supabase client instance.

### Implementation Blueprint:
File: `src/lib/supabase.ts`
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

---

## 4. Recommendation 2: Update Page-Level Auth Checking & Loading States
Incorporate an `authLoading` state on all routes that perform auth checks. Show a unified premium spinner rather than raw text or blank screens, preventing login flashes.

### A. Auth Page Refactoring (`src/app/auth/page.tsx`)
Intercept already logged-in users and redirect them to `/dashboard` before rendering the form:
```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [authLoading, setAuthLoading] = useState(true);
  // ... other states

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/dashboard");
        } else {
          setAuthLoading(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setAuthLoading(false);
      }
    };
    checkSession();
  }, [router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ... render login form
}
```

### B. Dashboard Page Refactoring (`src/app/dashboard/page.tsx`)
```typescript
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
// Note: Keep supabaseUrl definition locally since it is used to call functions:
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  // ... other states

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
        } else {
          setUser(session.user);
        }
      } catch (err) {
        console.error("Dashboard auth check error:", err);
        router.push("/auth");
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ... render dashboard content
}
```

### C. Jobs Page Refactoring (`src/app/jobs/page.tsx`)
```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function JobsPage() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  // ... other states

  useEffect(() => {
    const checkAuthAndFetchJobs = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
          return;
        }
        setUser(session.user);

        const cvText = localStorage.getItem("cv_for_jobs");
        if (!cvText) {
          setError("We need your CV to find matching jobs. Please analyze your CV on the Dashboard first.");
          return;
        }

        // Call the secure jobs api route
        const res = await fetch(`/api/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cv_text: cvText })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Failed to fetch jobs.");
        setJobs(data.jobs || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch jobs. Please try again.");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthAndFetchJobs();
  }, [router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ... render jobs list content
}
```

### D. Navbar Refactoring (`src/components/Navbar.tsx`)
Prevent the layout shift and flash of logged-out options in the global header:
```typescript
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.error("Navbar session check error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Use the loading state in render:
  // 1. In navigation links, do not render user-only links if loading is true.
  // 2. In user actions (right-hand container), show a loading pulse state or empty box while loading.
}
```
Using an animated skeleton like `<div className="h-8 w-20 animate-pulse bg-slate-800/50 rounded-full"></div>` while checking the session maintains the layout structure without flashing the "Sign Up / Log In" button.
