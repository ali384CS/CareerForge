// Test script for ATS Scoring logic

const TECH_SKILLS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "php", "go", "rust", "swift", "kotlin",
  "react", "angular", "vue", "next.js", "node.js", "express", "django", "flask", "spring", "laravel",
  "sql", "mysql", "postgresql", "mongodb", "redis", "firebase", "supabase", "docker", "kubernetes", "aws", "azure", "gcp",
  "html", "css", "sass", "tailwind", "git", "github", "gitlab", "ci/cd", "agile", "scrum", "machine learning", "ai",
  "data science", "data analysis", "pandas", "numpy", "tensorflow", "pytorch"
];

const SOFT_SKILLS = [
  "leadership", "communication", "teamwork", "problem solving", "time management", "critical thinking",
  "adaptability", "collaboration", "project management", "organization"
];

const ACTION_VERBS = [
  "managed", "developed", "led", "created", "designed", "implemented", "improved", "increased", "decreased",
  "spearheaded", "orchestrated", "architected", "optimized", "streamlined", "resolved"
];

function calculateAtsScore(cv_text, job_description) {
  const textLower = cv_text.toLowerCase();
  const words = textLower.match(/\b\w+\b/g) || [];
  const totalWords = words.length;

  // 1. Keyword Extraction
  const keywordsFound = new Set();
  let actionVerbsFound = 0;
  let keywordHitsCount = 0;

  TECH_SKILLS.forEach(skill => {
    if (textLower.includes(skill)) {
      keywordsFound.add(skill);
      const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
      const matches = textLower.match(regex);
      if (matches) {
        keywordHitsCount += matches.length;
      }
    }
  });

  SOFT_SKILLS.forEach(skill => {
    if (textLower.includes(skill)) {
      keywordsFound.add(skill);
      const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
      const matches = textLower.match(regex);
      if (matches) {
        keywordHitsCount += matches.length;
      }
    }
  });

  ACTION_VERBS.forEach(verb => {
    const matches = words.filter(w => w === verb);
    actionVerbsFound += matches.length;
  });

  // 2. Job Description Overlap & Missing Keywords
  const allSkills = [...TECH_SKILLS, ...SOFT_SKILLS];
  const jdSkills = new Set();
  let hasJobDescription = false;
  let jdOverlapScore = 0;
  let jdKeywordsMissing = [];

  if (job_description && typeof job_description === 'string' && job_description.trim() !== '') {
    hasJobDescription = true;
    const jdLower = job_description.toLowerCase();

    TECH_SKILLS.forEach(skill => {
      if (jdLower.includes(skill)) jdSkills.add(skill);
    });
    SOFT_SKILLS.forEach(skill => {
      if (jdLower.includes(skill)) jdSkills.add(skill);
    });

    if (jdSkills.size > 0) {
      const overlapSkills = new Set();
      jdSkills.forEach(skill => {
        if (keywordsFound.has(skill)) {
          overlapSkills.add(skill);
        } else {
          jdKeywordsMissing.push(skill);
        }
      });
      const overlapRatio = overlapSkills.size / jdSkills.size;
      jdOverlapScore = Math.round(overlapRatio * 40); // Max 40 points
    } else {
      // Fallback
      jdOverlapScore = 40;
    }
  }

  // Determine missing keywords list (up to 5)
  let keywordsMissing = [];
  if (hasJobDescription && jdSkills.size > 0) {
    keywordsMissing = jdKeywordsMissing.length > 0
      ? jdKeywordsMissing.slice(0, 5)
      : allSkills.filter(skill => !keywordsFound.has(skill)).sort(() => 0.5 - Math.random()).slice(0, 5);
  } else {
    keywordsMissing = allSkills
      .filter(skill => !keywordsFound.has(skill))
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
  }

  // 3. Scoring Calculation
  let score = 0;
  const density = totalWords > 0 ? (keywordHitsCount / totalWords) * 100 : 0;

  if (hasJobDescription) {
    // Job Description Match Mode (Total: 100 points)
    // A. Overlap Score (40 pts)
    score += jdOverlapScore;
    
    // B. General Keyword Match Count (20 pts)
    score += Math.min(keywordsFound.size * 2, 20); // 2 pts per unique skill, max 10 skills
    
    // C. Keyword Density (15 pts) - Ideal: 1.5% to 5.0%
    if (density >= 1.5 && density <= 5.0) {
      score += 15;
    } else if (density > 0) {
      score += 8;
    }
    
    // D. Action Verbs (15 pts) - 2.5 pts per occurrence
    score += Math.min(actionVerbsFound * 2.5, 15);
    
    // E. Formatting & Length (10 pts)
    if (totalWords >= 400 && totalWords <= 800) {
      score += 10;
    } else if (totalWords >= 150 && totalWords <= 1000) {
      score += 5;
    }
  } else {
    // General ATS Mode (Total: 100 points)
    // A. General Keyword Match Count (35 pts)
    score += Math.min(keywordsFound.size * 2, 35); // 2 pts per unique skill, max 17 skills
    
    // B. Keyword Density (25 pts) - Ideal: 1.5% to 5.0%
    if (density >= 1.5 && density <= 5.0) {
      score += 25;
    } else if (density > 0) {
      score += 12;
    }
    
    // C. Action Verbs (20 pts) - 2.5 pts per occurrence
    score += Math.min(actionVerbsFound * 2.5, 20);
    
    // D. Formatting & Length (20 pts)
    if (totalWords >= 400 && totalWords <= 800) {
      score += 20;
    } else if (totalWords >= 150 && totalWords <= 1000) {
      score += 10;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    keywordsFound: Array.from(keywordsFound),
    keywordsMissing,
    density,
    actionVerbsFound,
    totalWords
  };
}

// Run test cases
console.log("=== RUNNING ATS SCORING LOGIC TEST CASES ===");

// Test case 1: General mode (No JD) - standard CV
const cv1 = "Experienced Javascript and React engineer with strong leadership and communication skills. Developed multiple web apps.";
const res1 = calculateAtsScore(cv1, null);
console.log("Test Case 1 (General Mode, standard CV):", res1);

// Test case 2: General mode - minimal CV
const cv2 = "Hello world developer.";
const res2 = calculateAtsScore(cv2, null);
console.log("Test Case 2 (General Mode, minimal CV):", res2);

// Test case 3: JD Match Mode - high overlap
const cv3 = "Experienced React and Node.js developer. I developed web apps using JavaScript, TypeScript, Postgresql, and Docker.";
const jd3 = "Looking for a Javascript developer with React, Node.js, TypeScript, Postgresql, and Docker experience.";
const res3 = calculateAtsScore(cv3, jd3);
console.log("Test Case 3 (JD Mode, high overlap):", res3);

// Test case 4: JD Match Mode - low/no overlap
const cv4 = "Experienced React and Node.js developer.";
const jd4 = "Looking for a Python developer with Django, PyTorch, and Docker experience.";
const res4 = calculateAtsScore(cv4, jd4);
console.log("Test Case 4 (JD Mode, low overlap):", res4);

// Assertion checks
if (res1.score !== res2.score && res3.score !== res4.score && res3.score > res4.score) {
  console.log("SUCCESS: Scoring behaves dynamically and returns different, logical scores!");
} else {
  console.log("FAILURE: Scoring did not behave dynamically as expected.");
  process.exit(1);
}
