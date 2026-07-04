# Handoff Report — Fix ATS Scoring (R2)

## 1. Observation
1. **Dynamic Code Search Results**:
   - Verified that no hardcoded numeric score `66` (or code like `setAtsScore(66)`) is present in `src/` or `supabase/functions/`. 
   - A search of `v1_backup` only matched:
     ```css
     v1_backup\css\styles.css:462:.password-strength__bar.medium { width: 66%; background: var(--clr-warning); }
     ```
2. **Current Scoring Code** in `supabase/functions/analyze-cv/index.ts` (Lines 96–105):
   ```typescript
       // 3. Scoring Calculation
       let score = 40; // Base score
       score += Math.min(keywordsFound.size * 2, 30); // Up to 30 points for skills
       score += Math.min(actionVerbsFound * 2, 20); // Up to 20 points for action verbs
       
       // Length penalty
       if (words.length < 150) score -= 15;
       else if (words.length > 1000) score -= 10;
       else score += 10; // Ideal length bonus

       score = Math.max(0, Math.min(100, Math.round(score)));
   ```
3. **Mismatched Database Columns** in Deno function insertion vs SQL definition:
   - Deno function (`supabase/functions/analyze-cv/index.ts:129–134`) inserts:
     ```typescript
         const { error: dbError } = await supabase.from("cvs").insert({
           user_id: user.id,
           cv_text: cv_text,
           ats_score: resultPayload.ats_score,
           analysis_results: resultPayload
         });
     ```
   - SQL definition (`supabase/migrations.sql:40–47`) declares:
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
     *Note: There is no `cv_text` or `analysis_results` column in `cvs`, causing inserts to fail silently.*
4. **Dashboard payload** in `src/app/dashboard/page.tsx` (Lines 111–114) sends `job_description`:
   ```typescript
           body: JSON.stringify({
             cv_text: extractedText,
             job_description: jobDescription
           })
   ```

---

## 2. Logic Chain
1. The frontend dashboard sends `job_description` inside the fetch payload to the `analyze-cv` Edge Function.
2. The `analyze-cv` Edge Function only extracts `cv_text` from the request body, ignoring the job description.
3. Because the job description is ignored, the scoring is always run in a "general" mode.
4. The general mode uses a simplistic formula: base score 40 + ideal length bonus 10 + 2 points per unique skill (max 30) + 2 points per action verb (max 20).
5. For standard CV uploads that have ~5 keywords found and ~3 action verbs, this formula evaluates to exactly `40 + 10 + 10 + 6 = 66%`. This creates the illusion of a hardcoded score.
6. Updating the Edge Function to parse `job_description` from the body and using it to compare required keywords (intersected from our dictionaries) with the CV keywords resolves the lack of dynamic, JD-specific scores.
7. Modifying the database insert to target `extracted_text` instead of `cv_text` (and omitting `analysis_results` since it's not a database column) ensures the CV analysis is correctly stored in the Supabase database.

---

## 3. Caveats
- Since this is a read-only investigation, the proposed code has not been run or deployed live.
- It is assumed that the `cvs` database table schema in the remote Supabase project matches the SQL migration script `supabase/migrations.sql`.
- The local keyword dictionaries (`TECH_SKILLS`, `SOFT_SKILLS`, `ACTION_VERBS`) are used to extract terms from the job description in the proposed implementation. If a job description contains highly specialized skills not in those lists, they won't be matched unless the lists are expanded.

---

## 4. Conclusion
The implementer agent must:
1. Update `supabase/functions/analyze-cv/index.ts` to parse `job_description` from the request body.
2. Implement the proposed dual-mode scoring logic (General Mode vs Tailored Mode) to incorporate keyword match counts, keyword density, and job description overlap.
3. Fix the database insert in `analyze-cv/index.ts` to use `extracted_text: cv_text` and remove the non-existent `analysis_results` field.
4. Ensure the returned JSON format remains fully compatible with the dashboard expectations (containing `ats_score`, `keywords_found`, `keywords_missing`, `suggestions`, and `overall_feedback`).

The complete proposed implementation is ready in `d:\Jobhunt\.agents\explorer_m3_1\proposed_index.ts`.

---

## 5. Verification Method
1. **Build and Compilation**:
   - Run `npm run build` on the Next.js app to ensure the dashboard and client build successfully.
2. **Local Edge Function Testing / Deployment**:
   - Deploy/run the updated Edge Function.
   - Perform a mock POST call to the function with a standard bearer token:
     - **Test Case 1 (No JD)**: Send `{ "cv_text": "Experienced Javascript and React engineer with strong leadership and communication skills." }`. Verify the score is calculated dynamically based on keyword matches, density, and length.
     - **Test Case 2 (With matching JD)**: Send `{ "cv_text": "Experienced Javascript and React engineer.", "job_description": "We are looking for a Javascript developer with experience in React." }`. Verify a high score is returned (since CV skills overlap 100% with JD skills).
     - **Test Case 3 (With non-matching JD)**: Send `{ "cv_text": "Experienced Javascript and React engineer.", "job_description": "Looking for a Python and Docker specialist." }`. Verify a low score is returned.
3. **Database Insertion Verification**:
   - Verify that after calling the Edge Function, a new row is successfully created in the `cvs` table in Supabase, and no `Database insert error` is output in the function logs.
