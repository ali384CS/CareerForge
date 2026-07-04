# Milestone 2 Analysis: Fix session persistence (R1)

## Executive Summary
The session persistence bug is caused by duplicate and inline Supabase client initializations across multiple files that lack explicit session persistence configuration options, coupled with asynchronous auth checks on page load that lead to either blank screens or redirect flashes. This report outlines:
1. All current Supabase client initialization locations and their redirect implementations.
2. A concrete centralization strategy under `src/lib/supabase.ts` with explicit `persistSession: true` and `autoRefreshToken: true` configuration.
3. Specific page-level updates to implement clean loading states and prevent the login screen from flashing when a session is active.

---

## 1. Current Supabase Client Initializations

There are exactly **four** files in the frontend codebase where a Supabase client is initialized inline. In all locations, the initialization is identical and lacks custom auth options:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Locations:
1. **`src/components/Navbar.tsx`** (Lines 8-11)
   - *Auth check*: Listens to initial session on mount and subscribes to `onAuthStateChange`.
   - *Redirect*: Pushes to `/` on sign out.
2. **`src/app/auth/page.tsx`** (Lines 7-9)
   - *Auth check*: None on mount.
   - *Redirect*: Redirects to `/dashboard` only after successful form submission or via Google OAuth callback redirect parameter.
3. **`src/app/dashboard/page.tsx`** (Lines 8-10)
   - *Auth check*: Calls `supabase.auth.getSession()` inside `useEffect`.
   - *Redirect*: Redirects to `/auth` if no session is returned.
4. **`src/app/jobs/page.tsx`** (Lines 7-9)
   - *Auth check*: Calls `supabase.auth.getSession()` inside `useEffect`.
   - *Redirect*: Redirects to `/auth` if no session is returned.

---

## 2. Page-level Auth & Redirect Analysis

### `/dashboard` Page load behavior (`src/app/dashboard/page.tsx`)
- On load, `user` state is initialized to `null`.
- The page immediately checks the user state: `if (!user) return <div className="p-8 text-center">Loading...</div>;` (Line 280).
- This renders a basic `Loading...` message on screen.
- Concurrently, `checkAuth` runs asynchronously:
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
- If a session is found, `user` is updated, prompting a full render of the dashboard. If not, the router redirects to `/auth`.

### `/jobs` Page load behavior (`src/app/jobs/page.tsx`)
- On load, `user` is `null` and `loading` is `true`.
- The page evaluates: `if (!user) return null;` (Line 61).
- This yields a completely **blank/empty screen** during the asynchronous auth check.
- `checkAuthAndFetchJobs` runs asynchronously:
  ```typescript
  const checkAuthAndFetchJobs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth");
      return;
    }
    setUser(session.user);
    // ... fetches jobs ...
  };
  ```
- If no session, it redirects to `/auth`. If there is, it fetches jobs.

### `/auth` Page load behavior (`src/app/auth/page.tsx`)
- The page does **not** perform an auth check on mount.
- If a user is already authenticated (session is stored in `localStorage`) and they visit `/auth`, the login form is rendered immediately.
- This creates a major UX issue: authenticated users see the login form momentarily (or permanently) until they manually navigate away or a redirect is triggered (which is not currently implemented on mount).

---

## 3. Centralization Strategy (`src/lib/supabase.ts`)

A central Supabase client singleton should be created to manage state consistently and enforce session persistence configuration.

### Proposed Code for `src/lib/supabase.ts`:
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
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

## 4. Recommended Modifications per Component

### 4.1. `src/components/Navbar.tsx`
- **Before**:
  ```typescript
  import { createClient } from "@supabase/supabase-js";
  // ...
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```
- **After**:
  ```typescript
  import { supabase } from "@/lib/supabase";
  // remove inline URL/Anon Key declarations and createClient call
  ```

### 4.2. `src/app/auth/page.tsx`
- Add a session check on mount to redirect already-authenticated users to `/dashboard` immediately.
- Include a centered loading spinner while checking to prevent the login screen from flashing.
- **Proposed Changes**:
  ```typescript
  import { useState, useEffect } from "react";
  import { useRouter } from "next/navigation";
  import { supabase } from "@/lib/supabase";

  export default function AuthPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true); // New state
    const router = useRouter();

    useEffect(() => {
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/dashboard");
        } else {
          setCheckingAuth(false);
        }
      };
      checkSession();
    }, [router]);

    // Handle Auth logic...

    if (checkingAuth) {
      return (
        <div className="flex justify-center items-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
      // Existing login form structure
    );
  }
  ```

### 4.3. `src/app/dashboard/page.tsx`
- Replace client initialization with `import { supabase } from "@/lib/supabase"`.
- Use a dedicated `checkingAuth` state to control loading and avoid flash of unauthorized states.
- Render the standardized Tailwind loader spinner.
- **Proposed Changes**:
  ```typescript
  import { supabase } from "@/lib/supabase";
  // ...
  export default function Dashboard() {
    const [user, setUser] = useState<any>(null);
    const [checkingAuth, setCheckingAuth] = useState(true); // New state
    const router = useRouter();
    // ... rest of state

    useEffect(() => {
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
        } else {
          setUser(session.user);
          setCheckingAuth(false);
        }
      };
      checkAuth();
    }, [router]);

    // ... helper functions ...

    if (checkingAuth) {
      return (
        <div className="flex justify-center items-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
      // ... Dashboard JSX
    );
  }
  ```

### 4.4. `src/app/jobs/page.tsx`
- Replace client initialization with `import { supabase } from "@/lib/supabase"`.
- Add a dedicated `checkingAuth` state to avoid blank flash/empty page during auth checks.
- Render the standardized loader spinner.
- **Proposed Changes**:
  ```typescript
  import { supabase } from "@/lib/supabase";
  // ...
  export default function JobsPage() {
    const [user, setUser] = useState<any>(null);
    const [checkingAuth, setCheckingAuth] = useState(true); // New state
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
      const checkAuthAndFetchJobs = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
          return;
        }
        setUser(session.user);
        setCheckingAuth(false);

        // Fetch jobs logic...
      };
      checkAuthAndFetchJobs();
    }, [router]);

    if (checkingAuth) {
      return (
        <div className="flex justify-center items-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
      // ... Jobs Page JSX
    );
  }
  ```

---

## 5. Verification Plan

To verify that these changes resolve R1 completely, the following steps should be executed by the implementer/testing agent:

1. **Local Storage Inspection**:
   - Log in using a test account (email/password or Google OAuth).
   - Check local storage in the browser developer tools to verify that a key starting with `sb-` (e.g. `sb-[project-id]-auth-token`) exists and contains the correct session JSON.
2. **Page Refresh Test**:
   - Navigate to `/dashboard` or `/jobs`.
   - Refresh the browser page.
   - Verify that the page loads directly (after displaying the loading spinner for a brief fraction of a second) and does NOT redirect to `/auth`.
3. **Session Check Redirect Test**:
   - Close the browser tab and re-open `/dashboard`.
   - Verify the session persists and no login screen is shown.
4. **Flash of Login Screen Prevention**:
   - Navigate to `/auth` while logged in.
   - Verify that the login card is NOT displayed, and the page redirects straight to `/dashboard` after showing the loading spinner.
