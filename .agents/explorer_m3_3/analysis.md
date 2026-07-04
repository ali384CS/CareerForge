# Detailed Analysis Report: ATS Scoring (R2)

## 1. Executive Summary
This report analyzes the ATS scoring system of the CVOptimizer platform. During our read-only investigation, we found that:
1. There are **no hardcoded score values (such as `66`)** in the codebase. The score of 66 is an emergent property of the current base score (40), a lack of action verbs (0), the typical presence of about 8 technical/soft skills, and an ideal length bonus (+10).
2. The `analyze-cv` Edge Function currently destructures only `{ cv_text }` from the request body, **completely ignoring `job_description`**, which prevents any JD-specific scoring.
3. There are **critical database schema mismatches** in the Edge Functions (`analyze-cv`, `optimize-cv`, and `match-jobs`) where insertion queries target non-existent columns (like `cv_text` and `analysis_results`) or miss mandatory foreign keys (like `cv_id` in `optimized_cvs` and `job_matches`), which will cause runtime errors.

---

## 2. Hardcoded Score Investigation
We ran a comprehensive recursive search across all files in the workspace (excluding `node_modules`, `.next`, and `.git`) for the number `66` or calls to `setAtsScore` with fixed arguments. 
- **Result**: No hardcoded score value exists in the active source files.
- **emergent 66 Explanation**: 
  In the current `supabase/functions/analyze-cv/index.ts`, the score is computed as follows:
  - Base score = `40`
  - Skills found: `keywordsFound.size * 2` (up to 30)
  - Action verbs: `actionVerbsFound * 2` (up to 20)
  - Ideal length bonus (between 150 and 1000 words): `+10`
  
  For a typical student CV of length 150-1000 words (which earns `+10`), matching exactly `8` skills (earning `16`), and containing `0` action verbs from the predefined lists, the score matches:
  $$40 \text{ (base)} + 16 \text{ (skills)} + 0 \text{ (verbs)} + 10 \text{ (length)} = 66\%$$
  Since the backend ignores the job description, the score remains exactly `66%` on every click, creating the appearance of a hardcoded value.

---

## 3. NLP Scoring Algorithm in `analyze-cv`
The current backend algorithm at `supabase/functions/analyze-cv/index.ts` works as follows:
- **Keyword Matching**: It checks if a CV contains skills from `TECH_SKILLS` (46 entries) or `SOFT_SKILLS` (10 entries).
- **Action Verbs**: It counts occurrences of 15 strong verbs from `ACTION_VERBS`.
- **Length Constraint**:
  - Less than 150 words: `-15` points penalty
  - More than 1000 words: `-10` points penalty
  - 150 - 1000 words: `+10` points bonus
- **Formula**:
  $$\text{Score} = 40 + \min(\text{skills} \times 2, 30) + \min(\text{verbs} \times 2, 20) + \text{length\_factor}$$

### Limitations & Gaps:
- The `job_description` field is never destructured from the request body or used in scoring.
- Keyword density is not calculated (only presence is checked, meaning a keyword mentioned multiple times does not affect density metric).
- There is no overlap calculation with any user-provided job description.

---

## 4. Proposed Scoring Recalculation Logic
We propose a weighted scoring system that handles both cases (with and without a job description) and incorporates:
1. **Keyword Match Count**: Measures the presence of tech/soft skills.
2. **Keyword Density**: Measures the ratio of total keyword occurrences to total words, targeting the industry-ideal range of 2% - 5%.
3. **Job Description Overlap**: If a JD is provided, extracts keywords from the JD (or falls back to significant words) and calculates the percentage of these JD keywords present in the CV.

### Dynamic Weighting Breakdown:

| Metric | Weight (With JD) | Weight (Without JD) | Description / Target |
|---|---|---|---|
| **Keyword Match Count** | 30% (Max 30) | 50% (Max 50) | Scored out of a target of 10 skills found in the CV. |
| **Keyword Density** | 20% (Max 20) | 30% (Max 30) | Full points for 2%–5% density. Scaled down or penalized outside this range. |
| **Job Description Overlap** | 40% (Max 40) | 0% (N/A) | Overlap of JD keywords (or significant words) found in the CV. |
| **Action Verbs & Length** | 10% (Max 10) | 20% (Max 20) | Presence of strong action verbs and ideal word count (150–1000 words). |
| **Total** | **100% (100 pts)** | **100% (100 pts)** | |

---

## 5. Front-End and Back-End Interaction
- **Dashboard API Call**: 
  In `src/app/dashboard/page.tsx`, the function `handleAnalyze` sends a POST request:
  - Endpoint: `${supabaseUrl}/functions/v1/analyze-cv`
  - Payload: `{ cv_text: extractedText, job_description: jobDescription }`
  - Headers: Authorization bearer JWT is correctly attached.
- **Dashboard Display**:
  - The returned `ats_score` (defensively mapped via `payload.ats_score ?? payload.score`) is set in the state `atsScore`.
  - It renders in a large text component with dynamic colors:
    - `>= 80`: Emerald (`text-emerald-400`)
    - `>= 50`: Amber (`text-amber-400`)
    - `< 50`: Red (`text-red-400`)
  - Found and missing keywords are displayed beneath the score using tags.

---

## 6. Critical System Finding: Database Schema Mismatches
During our investigation of the SQL migration script (`supabase/migrations.sql`) against the Edge Functions, we found three critical database discrepancies:

1. **`analyze-cv` Insert Mismatch**:
   - *Code tries to insert*: `{ user_id, cv_text, ats_score, analysis_results }`
   - *DB schema for table `cvs` only has*: `{ id, user_id, file_url, extracted_text, ats_score, created_at }`
   - *Result*: The insert fails because `cv_text` and `analysis_results` do not exist in the table. `extracted_text` must be used instead of `cv_text`.

2. **`optimize-cv` Insert Mismatch**:
   - *Code tries to insert*: `{ user_id, original_cv_text, optimized_cv_text, job_description }`
   - *DB schema for table `optimized_cvs` has*: `{ id, cv_id, job_description, optimized_text, suggestions, created_at }`
   - *Result*: The insert fails because `user_id` and `original_cv_text` are not columns, `optimized_cv_text` should be `optimized_text`, and it fails the non-nullable foreign key constraint on `cv_id`.

3. **`match-jobs` Insert Mismatch**:
   - *Code tries to insert*: `{ user_id, job_title, company, job_url, match_score, skill_gaps, matching_skills }`
   - *DB schema for table `job_matches` has*: `{ id, cv_id, job_title, company, job_url, match_score, skill_gaps, created_at }` (No `user_id` or `matching_skills`).
   - *Result*: The insert fails because `user_id` does not exist on `job_matches` (it uses `cv_id` referencing `cvs`).

---

## 7. Proposed Code Implementation Details

Here is the recommended code changes for `supabase/functions/analyze-cv/index.ts`.

### Parse `job_description` from request body:
```typescript
// Replace lines 51-52 in supabase/functions/analyze-cv/index.ts:
const reqBody = await req.json();
const { cv_text, job_description } = reqBody;
```

### Complete Proposed ATS Scoring Code Block:
```typescript
    // ============================================
    // ATS ALGORITHM LOGIC
    // ============================================
    const textLower = cv_text.toLowerCase();
    const words = textLower.match(/\b\w+\b/g) || [];
    
    // 1. Predefined Keyword Extraction from CV
    const keywordsFound = new Set<string>();
    let actionVerbsFound = 0;
    
    TECH_SKILLS.forEach(skill => {
      if (textLower.includes(skill)) keywordsFound.add(skill);
    });
    SOFT_SKILLS.forEach(skill => {
      if (textLower.includes(skill)) keywordsFound.add(skill);
    });
    ACTION_VERBS.forEach(verb => {
      if (words.includes(verb)) actionVerbsFound++;
    });

    // 2. Identify Missing Predefined Keywords
    const allSkills = [...TECH_SKILLS, ...SOFT_SKILLS];
    const keywordsMissing = allSkills
      .filter(skill => !keywordsFound.has(skill))
      .sort(() => 0.5 - Math.random()) // Pick random missing ones for variety
      .slice(0, 5);

    // 3. Keyword Occurrences & Density Calculation
    let totalKeywordOccurrences = 0;
    allSkills.forEach(skill => {
      const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'gi');
      const matches = cv_text.match(regex);
      if (matches) {
        totalKeywordOccurrences += matches.length;
      }
    });
    const densityPercentage = words.length > 0 ? (totalKeywordOccurrences / words.length) * 100 : 0;

    // 4. Score Calculation based on Job Description Presence
    let score = 0;
    let keywordScore = 0;
    let densityScore = 0;
    let overlapScore = 0;
    let verbScore = 0;
    let lengthScore = 0;

    const hasJobDescription = job_description && typeof job_description === 'string' && job_description.trim() !== '';

    if (hasJobDescription) {
      // SCENARIO A: Job Description provided (Weighted: 30% Keywords, 20% Density, 40% Overlap, 10% Verbs/Length)
      
      // A.1 Keyword Match Score (Max 30)
      keywordScore = Math.min((keywordsFound.size / 10) * 30, 30);

      // A.2 Keyword Density Score (Max 20)
      // Ideal range: 2% - 5%
      if (densityPercentage >= 2 && densityPercentage <= 5) {
        densityScore = 20;
      } else if (densityPercentage < 2) {
        densityScore = Math.round((densityPercentage / 2) * 20);
      } else {
        // Density > 5%, penalize keyword stuffing
        densityScore = Math.max(0, Math.round(20 - (densityPercentage - 5) * 4));
      }

      // A.3 Job Description Overlap Score (Max 40)
      const jdLower = job_description.toLowerCase();
      
      // Extract predefined skills from JD
      const jdKeywords = new Set<string>();
      TECH_SKILLS.forEach(skill => {
        if (jdLower.includes(skill)) jdKeywords.add(skill);
      });
      SOFT_SKILLS.forEach(skill => {
        if (jdLower.includes(skill)) jdKeywords.add(skill);
      });

      if (jdKeywords.size > 0) {
        let overlapCount = 0;
        jdKeywords.forEach(kw => {
          if (keywordsFound.has(kw)) overlapCount++;
        });
        overlapScore = Math.round((overlapCount / jdKeywords.size) * 40);
      } else {
        // Fallback: extract significant words (>4 chars, excluding stopwords) from JD
        const STOP_WORDS = new Set([
          "about", "above", "after", "again", "against", "along", "am", "an", "and", "any", "are", "as", "at",
          "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "could",
          "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has",
          "have", "having", "he", "her", "here", "hers", "him", "his", "how", "if", "in", "into", "is", "it", "its",
          "me", "more", "most", "my", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "our",
          "out", "over", "own", "same", "she", "should", "so", "some", "such", "than", "that", "the", "their",
          "them", "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
          "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
          "with", "would", "you", "your", "yours", "yourself", "yourselves"
        ]);
        const jdWords = jdLower.match(/\b\w+\b/g) || [];
        const jdSigWords = new Set(jdWords.filter(w => w.length > 4 && !STOP_WORDS.has(w)));

        if (jdSigWords.size > 0) {
          let overlapCount = 0;
          jdSigWords.forEach(word => {
            if (words.includes(word)) overlapCount++;
          });
          overlapScore = Math.round((overlapCount / jdSigWords.size) * 40);
        } else {
          overlapScore = 0;
        }
      }

      // A.4 Verbs & Length Score (Max 10)
      verbScore = Math.min(actionVerbsFound * 2, 6); // Up to 6 points
      lengthScore = (words.length >= 150 && words.length <= 1000) ? 4 : 0; // 4 points

      score = keywordScore + densityScore + overlapScore + verbScore + lengthScore;

    } else {
      // SCENARIO B: No Job Description provided (Weighted: 50% Keywords, 30% Density, 20% Verbs/Length)
      
      // B.1 Keyword Match Score (Max 50)
      keywordScore = Math.min((keywordsFound.size / 10) * 50, 50);

      // B.2 Keyword Density Score (Max 30)
      if (densityPercentage >= 2 && densityPercentage <= 5) {
        densityScore = 30;
      } else if (densityPercentage < 2) {
        densityScore = Math.round((densityPercentage / 2) * 30);
      } else {
        // Density > 5%, penalize keyword stuffing
        densityScore = Math.max(0, Math.round(30 - (densityPercentage - 5) * 6));
      }

      // B.3 Verbs & Length Score (Max 20)
      verbScore = Math.min(actionVerbsFound * 3, 12); // Up to 12 points
      lengthScore = (words.length >= 150 && words.length <= 1000) ? 8 : 0; // 8 points

      score = keywordScore + densityScore + verbScore + lengthScore;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
```

### Proposed Database Insertion Fix:
To prevent runtime database insertion failures, update the DB insert section of `analyze-cv/index.ts`:
```typescript
    // Save to DB (Corrected payload matching schema in migrations.sql)
    const { error: dbError } = await supabase.from("cvs").insert({
      user_id: user.id,
      extracted_text: cv_text, // Column name must match migrations.sql exactly (extracted_text instead of cv_text)
      ats_score: resultPayload.ats_score
      // Omit analysis_results as it is not in migrations.sql
    });
```
*Note: If the frontend needs to persist `analysis_results` or if it's required for history, a migration script must be run to add `analysis_results JSONB` and `cv_text TEXT` to the `cvs` table.*
