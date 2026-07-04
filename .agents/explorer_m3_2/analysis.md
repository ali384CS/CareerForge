# Detailed Analysis: Milestone 3 — Fix ATS Scoring (R2)

## 1. Executive Summary
This report analyzes the ATS scoring mechanism of the CVOptimizer platform. It details the investigation into hardcoded score values, dissects the existing serverless NLP scoring algorithm in `supabase/functions/analyze-cv/index.ts`, inspects the frontend dashboard integration, and proposes a comprehensive, mathematically balanced scoring algorithm that incorporates keyword match counts, keyword density, and job description overlap.

---

## 2. Hardcoded Score Investigation
A comprehensive search was performed across the codebase to identify any hardcoded ATS score values (e.g., search patterns like `66`, `setAtsScore(66)`). 

### Findings:
1. **No hardcoded score values** exist in the active source code. The only occurrences of the number `66` in `src/` are SVG path coordinates inside the Google Login icon on the authentication page (`src/app/auth/page.tsx:136-138`).
2. **Origin of the "66%" score**: The score of `66` is a mathematical consequence of the default NLP scoring algorithm in `supabase/functions/analyze-cv/index.ts`. When a standard student CV is uploaded:
   - Base score starts at `40`.
   - Typically, exactly 8 skills match the static dictionaries (`8 * 2 = 16` points).
   - Typically, no action verbs are matched (`0` points).
   - The CV length is usually between 150 and 1000 words, granting the ideal length bonus of `+10`.
   - **Total Score = 40 + 16 + 0 + 10 = 66**.
   Because the algorithm was static and did not incorporate the job description, many standard CVs consistently scored exactly 66%, creating the impression of a hardcoded value.

---

## 3. Current NLP Scoring Algorithm Analysis
The serverless function `supabase/functions/analyze-cv/index.ts` implements a custom rule-based scoring mechanism:

### Dictionary Lists
- **`TECH_SKILLS`** (46 items): Standard technologies (`javascript`, `typescript`, `python`, `react`, `postgresql`, etc.).
- **`SOFT_SKILLS`** (10 items): `leadership`, `communication`, `teamwork`, `problem solving`, `time management`, `critical thinking`, `adaptability`, `collaboration`, `project management`, `organization`.
- **`ACTION_VERBS`** (15 items): `managed`, `developed`, `led`, `created`, `designed`, `implemented`, `improved`, `increased`, `decreased`, `spearheaded`, `orchestrated`, `architected`, `optimized`, `streamlined`, `resolved`.

### Current Code Snippet (`supabase/functions/analyze-cv/index.ts` lines 71-105):
```typescript
    const textLower = cv_text.toLowerCase();
    const words = textLower.match(/\b\w+\b/g) || [];
    
    // 1. Keyword Extraction
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

    // 2. Identify Missing Keywords
    const allSkills = [...TECH_SKILLS, ...SOFT_SKILLS];
    const keywordsMissing = allSkills
      .filter(skill => !keywordsFound.has(skill))
      .sort(() => 0.5 - Math.random()) // Pick random missing ones for variety
      .slice(0, 5);

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

### Limitations Identified:
- **No Job Description Support**: The function expects `{ cv_text }` in the POST body but ignores `job_description`.
- **Lack of Keyword Density Checks**: It only checks *presence* of keywords using `.includes()`, ignoring word occurrences or relative density.
- **Static Output**: Users get the same feedback and score regardless of the job description they target.

---

## 4. Proposed Updates to the Edge Function

### A. Parsing `job_description`
The Edge Function request handler needs to extract `job_description` from the JSON body.
**Current parsing (`supabase/functions/analyze-cv/index.ts` lines 51-52):**
```typescript
    const reqBody = await req.json();
    const { cv_text } = reqBody;
```
**Proposed parsing:**
```typescript
    const reqBody = await req.json();
    const { cv_text, job_description } = reqBody;
```

---

### B. Proposing Scoring Recalculation Logic
We propose a dynamic, mathematically balanced scoring model split into two branches depending on the presence of a job description:

```
                            Is Job Description Provided?
                                     /       \
                                   Yes        No
                                   /            \
              - Job Overlap:  40 pts        - Keyword Match: 50 pts
              - Keyword Match: 30 pts       - Density:       30 pts
              - Density:       20 pts       - Action Verbs:  20 pts
              - Action Verbs:  10 pts       
```

#### 1. Keyword Match Score
Measures the breadth of industry skills matched from the global dictionary (`ALL_SKILLS = [...TECH_SKILLS, ...SOFT_SKILLS]`).
- **With Job Description**: Max **30 points**.
  Formula: `score_match = Math.min(uniqueSkillsFoundCount * 3, 30)` (10 unique skills to max).
- **Without Job Description**: Max **50 points**.
  Formula: `score_match = Math.min(uniqueSkillsFoundCount * 4, 50)` (13 unique skills to max).

#### 2. Keyword Density Score
Encourages candidate to maintain a healthy ratio of keywords to total words to prevent both sparse content and keyword stuffing.
- **Calculation**:
  - `totalKeywordOccurrences` = sum of occurrences of all global dictionary skills in CV text.
  - `keywordDensity = (totalKeywordOccurrences / totalWordsCount) * 100`.
- **With Job Description**: Max **20 points**.
  - Ideal range: `2% <= keywordDensity <= 6%` $\rightarrow$ **20 points**.
  - Sparse range (`< 2%`): `(keywordDensity / 2) * 20` points.
  - Stuffing range (`> 6%`): Penalty of `5` points for every `1%` above `6%`, down to `0`.
- **Without Job Description**: Max **30 points**.
  - Ideal range: `2% <= keywordDensity <= 6%` $\rightarrow$ **30 points**.
  - Sparse range (`< 2%`): `(keywordDensity / 2) * 30` points.
  - Stuffing range (`> 6%`): Penalty of `7.5` points for every `1%` above `6%`, down to `0`.

#### 3. Action Verbs Score
Encourages action-oriented resume bullet points.
- **With Job Description**: Max **10 points** (`Math.min(actionVerbsFoundCount * 2, 10)`).
- **Without Job Description**: Max **20 points** (`Math.min(actionVerbsFoundCount * 2, 20)`).

#### 4. Job Description Overlap Score (Only when JD is provided, Max 40 points)
- **Keyword Extraction from JD**: Run standard skill extraction on the job description to identify the targeted skills list (`jdSkills`).
- **Overlap Calculation**:
  - If `jdSkills` is empty, fallback: default the overlap score to a baseline of `30` points.
  - If `jdSkills` has elements:
    - Count how many of these `jdSkills` are present in the CV (`matchedJdSkills`).
    - `overlapRatio = matchedJdSkillsCount / jdSkillsCount`.
    - `score_overlap = Math.round(overlapRatio * 40)`.

#### 5. Length Adjustments (Modifiers)
Applied to the final score, clamped between `0` and `100`:
- **Underlength** (`< 150` words): `-10` points.
- **Overlength** (`> 1000` words): `-5` points.
- **Ideal length** (`150` to `1000` words): `+5` points.

---

## 5. Proposed Edge Function Code Structure
Below is a code implementation template for `supabase/functions/analyze-cv/index.ts` incorporating the new logic:

```typescript
// ============================================
// DYNAMIC ATS SCORING & OVERLAP ALGORITHM
// ============================================
const textLower = cv_text.toLowerCase();
const words = textLower.match(/\b\w+\b/g) || [];
const totalWords = words.length || 1;

const ALL_SKILLS = [...TECH_SKILLS, ...SOFT_SKILLS];

// 1. Extract CV Keywords
const cvKeywordsFound = new Set<string>();
let totalKeywordOccurrences = 0;
let actionVerbsFound = 0;

ALL_SKILLS.forEach(skill => {
  if (textLower.includes(skill)) {
    cvKeywordsFound.add(skill);
    // Count occurrences of skill
    const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      totalKeywordOccurrences += matches.length;
    }
  }
});

ACTION_VERBS.forEach(verb => {
  const regex = new RegExp(`\\b${verb}\\b`, 'gi');
  const matches = textLower.match(regex);
  if (matches) {
    actionVerbsFound += matches.length;
  }
});

const keywordDensity = (totalKeywordOccurrences / totalWords) * 100;
const uniqueSkillsCount = cvKeywordsFound.size;

// 2. Score Calculation
let baseScore = 0;
let matchScore = 0;
let densityScore = 0;
let verbScore = 0;
let overlapScore = 0;

const hasJobDescription = job_description && typeof job_description === 'string' && job_description.trim() !== '';

if (hasJobDescription) {
  const jdLower = job_description.toLowerCase();
  const jdSkills = new Set<string>();
  
  ALL_SKILLS.forEach(skill => {
    if (jdLower.includes(skill)) {
      jdSkills.add(skill);
    }
  });

  // Calculate Overlap Score (Max 40)
  if (jdSkills.size > 0) {
    const matchedJdSkills = [...jdSkills].filter(skill => cvKeywordsFound.has(skill));
    const overlapRatio = matchedJdSkills.length / jdSkills.size;
    overlapScore = Math.round(overlapRatio * 40);
  } else {
    overlapScore = 30; // Default baseline if JD contains no predefined skills
  }

  // Keyword Match Score (Max 30)
  matchScore = Math.min(uniqueSkillsCount * 3, 30);

  // Keyword Density Score (Max 20)
  if (keywordDensity >= 2 && keywordDensity <= 6) {
    densityScore = 20;
  } else if (keywordDensity < 2) {
    densityScore = Math.round((keywordDensity / 2) * 20);
  } else {
    densityScore = Math.max(0, Math.round(20 - (keywordDensity - 6) * 5));
  }

  // Action Verbs Score (Max 10)
  verbScore = Math.min(actionVerbsFound * 2, 10);
  
} else {
  // Keyword Match Score (Max 50)
  matchScore = Math.min(uniqueSkillsCount * 4, 50);

  // Keyword Density Score (Max 30)
  if (keywordDensity >= 2 && keywordDensity <= 6) {
    densityScore = 30;
  } else if (keywordDensity < 2) {
    densityScore = Math.round((keywordDensity / 2) * 30);
  } else {
    densityScore = Math.max(0, Math.round(30 - (keywordDensity - 6) * 7.5));
  }

  // Action Verbs Score (Max 20)
  verbScore = Math.min(actionVerbsFound * 2, 20);
}

// 3. Length adjustments
let lengthModifier = 5; // Default ideal length bonus
if (totalWords < 150) {
  lengthModifier = -10;
} else if (totalWords > 1000) {
  lengthModifier = -5;
}

const finalScore = Math.max(0, Math.min(100, matchScore + densityScore + verbScore + overlapScore + lengthModifier));
```

---

## 6. Frontend Dashboard Integration
The client dashboard page (`src/app/dashboard/page.tsx`) communicates with the serverless backend via the standard fetch API inside the `handleAnalyze` handler:

### Call Structure:
```typescript
      const { data: { session } } = await supabase.auth.getSession();
      
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
      const analyzeData = await analyzeRes.json();
```
The request payload **already includes** `job_description: jobDescription` (which references state `jobDescription` updated by the textarea in `src/app/dashboard/page.tsx:330-336`).

### UI Binding:
- Displays match rate score with dynamic coloring:
  - $\ge 80\%$: Emerald (`text-emerald-400`)
  - $50\% - 79\%$: Amber (`text-amber-400`)
  - $< 50\%$: Red (`text-red-400`)
- Lists found keywords and missing keywords in two distinct side-by-side grids.

Since the frontend is already fully prepared to send `job_description` and render the dynamic score, no frontend changes are required to enable job description scoring. Implementing the backend changes inside Deno Edge function `analyze-cv` is sufficient.
