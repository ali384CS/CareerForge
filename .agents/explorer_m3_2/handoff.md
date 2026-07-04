# Handoff Report: Milestone 3 — Fix ATS Scoring (R2)

## 1. Observation
- **Search for Hardcoded Score Value**: A recursive regex search for `\b66\b` and `setAtsScore` was performed on `src/` and `supabase/functions/` directories.
  - In `src/app/auth/page.tsx:136-138`, the number `66` appears strictly in SVG coordinates (e.g. `2.66l`, `.66`).
  - In `src/app/dashboard/page.tsx:22` and `124`, the state hook `atsScore` and its setter `setAtsScore` are defined and updated based on HTTP responses:
    - Line 22: `const [atsScore, setAtsScore] = useState<number | null>(null);`
    - Line 124: `setAtsScore(extractedScore);`
  - There is no hardcoded number `66` passed to `setAtsScore` or used in backend scoring functions.
- **Backend NLP Scoring Function**:
  - In `supabase/functions/analyze-cv/index.ts:51-52`, the Deno serverless function only extracts `cv_text` from the request JSON:
    `const { cv_text } = reqBody;`
  - In `supabase/functions/analyze-cv/index.ts:96-103`, the score is calculated via:
    ```typescript
    let score = 40; // Base score
    score += Math.min(keywordsFound.size * 2, 30); // Up to 30 points for skills
    score += Math.min(actionVerbsFound * 2, 20); // Up to 20 points for action verbs
    // Length penalty
    if (words.length < 150) score -= 15;
    else if (words.length > 1000) score -= 10;
    else score += 10; // Ideal length bonus
    ```
- **Frontend Dashboard Invocation**:
  - In `src/app/dashboard/page.tsx:105-115`, the fetch payload includes `job_description: jobDescription`:
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

---

## 2. Logic Chain
1. Since the search for `66` yielded no hardcoded ATS score variables in the source files, but typical student resumes score exactly `66` under the existing algorithm (`40 base + 16 keywords + 0 verbs + 10 length = 66`), the score behavior is due to the static nature of the matching engine, not a hardcoded score assignment.
2. The `analyze-cv` serverless function only parses `cv_text` and does not bind or process `job_description` (Observation 2).
3. The client-side dashboard *does* send `job_description` inside the POST request body to the serverless function (Observation 3).
4. Therefore, the implementation of dynamic, customized NLP scoring must be done purely server-side in the Deno Edge Function `supabase/functions/analyze-cv/index.ts` by:
   - Extracting `job_description` from the parsed request body.
   - Extracting targeted keywords from the job description.
   - Performing overlap comparison and distributing the 100-point maximum score dynamically depending on whether a job description was provided.

---

## 3. Caveats
- **Keyword Dictionaries**: The keyword matching relies on the hardcoded list of standard skills in the serverless function (`TECH_SKILLS` and `SOFT_SKILLS`). It does not use external AI-powered NLP models, matching the requirement constraints.
- **Mammoth & PDF.js CDNs**: Text extraction from DOCX and PDF is handled client-side using CDNs. Edge functions only process raw extracted text.

---

## 4. Conclusion
The issue is situated in `supabase/functions/analyze-cv/index.ts`. It ignores the `job_description` parameter sent by the client, and calculates scores using a static set of keywords. 
To fix this:
1. Update `analyze-cv` to parse `job_description`.
2. Implement the proposed scoring branching:
   - **With JD**: Overlap (40 pts) + Keyword Match (30 pts) + Density (20 pts) + Action Verbs (10 pts) + Length adjustments (-10 to +5 pts).
   - **Without JD**: Keyword Match (50 pts) + Density (30 pts) + Action Verbs (20 pts) + Length adjustments (-10 to +5 pts).
No frontend changes are necessary as the dashboard already transmits the job description to the backend.

---

## 5. Verification Method
- **Static Analysis**: 
  - Ensure Deno configuration permits deploying `supabase/functions/analyze-cv/index.ts` and that no syntax errors exist.
- **Execution Test**:
  - Run the build/lint command using `npm run lint`.
  - Invoke `supabase/functions/analyze-cv` using a REST client (e.g. `curl` or Postman) or directly from the frontend dashboard after deploying.
  - **Test Case 1 (Without JD)**: Submit a CV. Note the score.
  - **Test Case 2 (With JD matching CV)**: Submit same CV with a job description containing skills mentioned in the CV. Confirm that the score is higher than Test Case 1.
  - **Test Case 3 (With JD not matching CV)**: Submit same CV with a job description containing completely different skills. Confirm that the score is lower.
