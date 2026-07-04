# CVOptimizer ATS Scoring Analysis

## Executive Summary
This report analyzes the ATS scoring system of the CVOptimizer platform. Investigation shows there is no static hardcoded score (e.g. `score = 66`) in the source code; rather, the current heuristic NLP algorithm frequently returns exactly `66` for standard-length CVs containing average skill sets and verb counts. We propose a robust, dual-mode scoring recalculation logic that supports both general scoring and job description overlap matching, parsing `job_description` from the request body.

---

## 1. Hardcoded Score Investigation
A comprehensive search was performed across all frontend Next.js pages and backend Supabase Edge Functions. No static hardcoded score of `66` (such as `setAtsScore(66)`) exists. 
The only matches for "66" in the codebase are:
- `src/app/auth/page.tsx` (SVG paths containing coordinate values like `66` and `2.66`)
- `v1_backup/css/styles.css` (password strength bar style setting `width: 66%`)

The observation of a consistent score of `66` in practice is due to the current custom NLP algorithm's base values, multipliers, and bounds, which mathematically produce exactly `66` for a standard CV of ideal length containing 5 keywords and 3 action verbs.

---

## 2. Inspection of Current NLP Scoring Algorithm
The custom NLP scoring algorithm is located in `supabase/functions/analyze-cv/index.ts`. 

### Key Constants
The algorithm uses three hardcoded dictionaries:
- `TECH_SKILLS` (46 technology keywords, e.g., JavaScript, React, SQL, AWS, Docker)
- `SOFT_SKILLS` (10 soft skills, e.g., leadership, communication, teamwork)
- `ACTION_VERBS` (15 action verbs, e.g., managed, developed, led, optimized)

### Scoring Code (Lines 95–105)
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

### Derivation of Score 66
For a standard CV upload:
- The CV is between 150 and 1000 words: `+10` bonus (Running score: `50`)
- The CV contains 5 unique technical or soft skills: `5 * 2 = 10` points (Running score: `60`)
- The CV contains 3 action verbs: `3 * 2 = 6` points (Running score: `66`)
- **Total ATS Score = 66%**

---

## 3. Parsing `job_description` from Request Body
Currently, the `analyze-cv` Edge Function (Deno) does not parse `job_description` from the request.
In `supabase/functions/analyze-cv/index.ts` (lines 51–52):
```typescript
    const reqBody = await req.json();
    const { cv_text } = reqBody;
```

### Proposed Update
To accept the optional job description, update the request body parsing to:
```typescript
    const reqBody = await req.json();
    const { cv_text, job_description } = reqBody;
```
This is fully compatible with the frontend, which already sends `job_description` in the POST payload.

---

## 4. Proposed Scoring Recalculation Logic
We propose a dual-mode scoring algorithm that distinguishes between **General ATS Compatibility** (no JD provided) and **Tailored Job Fit** (JD provided).

### Helper Computations
1. **Total Words**: Number of words in CV.
2. **Keyword Hits**: Total count of all keyword matches in CV, including repetitions.
3. **Keyword Density**: `(Keyword Hits / Total Words) * 100` (expressed as percentage).

---

### Mode A: General ATS Scoring (No Job Description)
Evaluates general format, skills breadth, and action verb frequency.

| Component | Max Points | Formula / Logic |
|---|---|---|
| **Keyword Match Count** | 35 | `Math.min(keywordsFound.size * 2, 35)` (2 points per unique skill, max 17 skills) |
| **Keyword Density** | 25 | Full **25 pts** if density is between 1.5% and 5.0%. **12 pts** if density is >0% but outside ideal range. **0 pts** if 0%. |
| **Action Verbs** | 20 | `Math.min(actionVerbsFound * 2.5, 20)` (2.5 points per verb match, max 8 verbs) |
| **Formatting & Length** | 20 | **20 pts** if word count is between 400 and 800 (ideal). **10 pts** if between 150–399 or 801–1000. **0 pts** if <150 or >1000. |
| **Total** | **100** | Sum of above components. Bounds check: `Math.max(0, Math.min(100, Math.round(score)))` |

---

### Mode B: Tailored ATS Scoring (Job Description Provided)
Incorporates the direct overlap of skills specified in the job description.

1. **Extract JD Skills**: Intersect the job description text with the `TECH_SKILLS` and `SOFT_SKILLS` dictionaries to extract required keywords. Let this set be `jdSkills`.
2. **Calculate Overlap**: Compare `keywordsFound` from CV with `jdSkills`.
   - If `jdSkills.size > 0`: `jdOverlapRatio = (intersect size) / jdSkills.size`.
   - If `jdSkills.size == 0`: `jdOverlapRatio = 1.0` (no skills required in JD, default to max overlap points).
   - `jdOverlapScore = Math.round(jdOverlapRatio * 40)` (Max 40 points).

| Component | Max Points | Formula / Logic |
|---|---|---|
| **Job Description Overlap** | 40 | `jdOverlapScore` (calculated above). |
| **Keyword Match Count** | 20 | `Math.min(keywordsFound.size * 2, 20)` (general breadth of skills, 2 points per unique skill). |
| **Keyword Density** | 15 | Full **15 pts** if density is between 1.5% and 5.0%. **8 pts** if density is >0% but outside ideal range. |
| **Action Verbs** | 15 | `Math.min(actionVerbsFound * 2.5, 15)` (2.5 points per verb match, max 6 verbs). |
| **Formatting & Length** | 10 | **10 pts** if word count is between 400 and 800. **5 pts** if between 150–399 or 801–1000. |
| **Total** | **100** | Sum of above components. Bounds check: `Math.max(0, Math.min(100, Math.round(score)))` |

---

### Update to Feedback and Suggestions
If `job_description` is present:
- Prioritize missing JD skills in the `keywords_missing` array:
  ```typescript
  const jdKeywordsMissing = Array.from(jdSkills).filter(skill => !keywordsFound.has(skill));
  const keywordsMissing = jdKeywordsMissing.length > 0 
    ? jdKeywordsMissing.slice(0, 5) 
    : allSkills.filter(skill => !keywordsFound.has(skill)).sort(() => 0.5 - Math.random()).slice(0, 5);
  ```
- Generate a target recommendation if overlap is low:
  - If `jdOverlapScore < 25` (i.e. < 62.5% overlap): `suggestions.push("Your CV is missing several key skills listed in the job description. Consider incorporating keywords like: " + keywordsMissing.join(", "));`

---

## 5. Dashboard Calling and Score Display
The frontend dashboard calls the Edge Function and renders the results inside `src/app/dashboard/page.tsx`.

### Function Call (Lines 105–115)
The frontend currently sends both `cv_text` and `job_description` inside the request body:
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
This is fully correct and ready for the backend updates.

### Defensive Parsing (Lines 120–127)
```typescript
      const payload = analyzeData.data || analyzeData;
      const extractedScore = payload.ats_score ?? payload.score;
      
      if (extractedScore !== undefined && extractedScore !== null) {
        setAtsScore(extractedScore);
        setKeywordsFound(payload.keywords_found || []);
        setKeywordsMissing(payload.keywords_missing || []);
      }
```
This parsing is robust as it accepts both `ats_score` and `score` from the root or nested `data` object.

### UI Display (Lines 349–374)
The score is rendered in an animated or styled progress card:
```typescript
            {atsScore !== null && (
              <div className="glass-card p-6">
                <h2 className="font-outfit text-xl font-bold text-white mb-4">ATS Score</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`text-5xl font-outfit font-bold ${atsScore >= 80 ? 'text-emerald-400' : atsScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {atsScore}%
                  </div>
                  <div className="text-sm text-slate-400 uppercase tracking-wide">Match Rate</div>
                </div>
                ...
```
No changes are required in the frontend dashboard for parsing or displaying the score.

---

## Proposed Deno Function Code Draft (`supabase/functions/analyze-cv/index.ts`)
A proposed implementation of the scoring logic can be found in the accompanying handoff report and patch notes.
