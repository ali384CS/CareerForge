# Handoff Report: Fix ATS Scoring (R2)

## 1. Observation
- **`analyze-cv` Request Body Destructuring**:
  In `supabase/functions/analyze-cv/index.ts` lines 51-52:
  ```typescript
      const reqBody = await req.json();
      const { cv_text } = reqBody;
  ```
  This is the only destructuring block for `reqBody`.

- **Existing Scoring Calculation**:
  In `supabase/functions/analyze-cv/index.ts` lines 96-105:
  ```typescript
      let score = 40; // Base score
      score += Math.min(keywordsFound.size * 2, 30); // Up to 30 points for skills
      score += Math.min(actionVerbsFound * 2, 20); // Up to 20 points for action verbs
      
      // Length penalty
      if (words.length < 150) score -= 15;
      else if (words.length > 1000) score -= 10;
      else score += 10; // Ideal length bonus

      score = Math.max(0, Math.min(100, Math.round(score)));
  ```

- **Dashboard API Invocation**:
  In `src/app/dashboard/page.tsx` lines 105-115:
  ```typescript
        const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-cv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            cv_text: extractedText,
            job_description: jobDescription
          })
        });
  ```

- **Database Table Migrations**:
  In `supabase/migrations.sql` lines 40-47:
  ```sql
  CREATE TABLE IF NOT EXISTS public.cvs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      file_url TEXT,              -- URL to the file in Supabase Storage
      extracted_text TEXT,        -- Raw text extracted from the CV (PDF/DOCX)
      ats_score INTEGER,          -- ATS compatibility score (0-100)
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- **`analyze-cv` Insertion Code**:
  In `supabase/functions/analyze-cv/index.ts` lines 129-134:
  ```typescript
      const { error: dbError } = await supabase.from("cvs").insert({
        user_id: user.id,
        cv_text: cv_text,
        ats_score: resultPayload.ats_score,
        analysis_results: resultPayload
      });
  ```

- **Workspace Search Results**:
  Powershell recursive search for `66` inside `d:\Jobhunt` returned zero results other than `#666` colors in SVG files, and the user request documentation inside `.agents/` folder.

---

## 2. Logic Chain
1. Based on the **Workspace Search Results**, there are no hardcoded score values of `66` anywhere in the active source files.
2. Based on the **Existing Scoring Calculation**, the formula resolves to a score of exactly `66%` when a user uploads a CV with 150-1000 words (+10), containing 0 action verbs (+0), and matching exactly 8 predefined skills (+16) on top of the base score of 40 ($40 + 16 + 0 + 10 = 66$).
3. Based on the **`analyze-cv` Request Body Destructuring**, only `cv_text` is destructured and processed; `job_description` is entirely omitted from processing, meaning any job description entered by the user in the front-end dashboard does not influence the score.
4. Based on the **Dashboard API Invocation**, the front-end properly transmits `job_description` in the POST payload body to `analyze-cv`. Therefore, the lack of JD scoring is purely a back-end limitation.
5. Based on the **Database Table Migrations** and **`analyze-cv` Insertion Code**, the table `cvs` does not have columns named `cv_text` or `analysis_results` (it uses `extracted_text`). Inserting into these non-existent columns will result in database execution errors at runtime.

---

## 3. Caveats
- We did not connect to a live Supabase instance or execute Deno serverless functions locally (read-only restriction).
- We assumed the user's migration script represents the ground-truth database schema; if the database is running with a different schema not recorded in `migrations.sql`, that might prevent insertion errors but represents a sync violation.

---

## 4. Conclusion
The ATS scoring is not hardcoded, but behaves as such due to:
1. Ignoring `job_description` in the backend Edge Function `analyze-cv`.
2. A simplistic scoring logic that frequently evaluates typical student resumes to a match score of `66%`.

To fix this, the backend must be updated to parse `job_description`, apply a robust weighted scoring model (using Keyword Match, Keyword Density, and Job Description Overlap), and correct the database schema column mismatches (e.g. mapping `cv_text` to `extracted_text` in the insert statement) to avoid runtime crashes.

---

## 5. Verification Method
To verify the fix:
1. **Mock Test Verification**:
   Submit the same CV text with two distinct job descriptions (e.g., one focusing heavily on "React/TypeScript", another on "Python/Django").
   - *Expected Result*: The backend returns two different scores reflecting the differing overlaps.
2. **Database Insertion Verification**:
   Execute the analysis function and inspect the `cvs` table in Supabase.
   - *Expected Result*: Row is successfully inserted into the `cvs` table without column name errors.
3. **Keyword Density Verification**:
   Upload a CV with normal keywords and another with the same keyword stuffed repeatedly.
   - *Expected Result*: The stuffed CV's density score drops, penalizing the stuffing behavior.
