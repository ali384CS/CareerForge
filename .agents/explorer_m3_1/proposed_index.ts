import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ============================================
// CUSTOM NLP ATS ALGORITHM DICTIONARIES
// ============================================
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

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const reqBody = await req.json();
    const { cv_text, job_description } = reqBody;

    if (!cv_text || typeof cv_text !== 'string' || cv_text.trim() === '') {
      return jsonResponse({ success: false, error: "CV text is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    // ============================================
    // ATS ALGORITHM LOGIC
    // ============================================
    const textLower = cv_text.toLowerCase();
    const words = textLower.match(/\b\w+\b/g) || [];
    const totalWords = words.length;

    // 1. Keyword Extraction
    const keywordsFound = new Set<string>();
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
    const jdSkills = new Set<string>();
    let hasJobDescription = false;
    let jdOverlapScore = 0;
    let jdKeywordsMissing: string[] = [];

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
        const overlapSkills = new Set<string>();
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
        // Fallback: if no skills from dictionary are in JD, default to max overlap points
        jdOverlapScore = 40;
      }
    }

    // Determine missing keywords list (up to 5)
    let keywordsMissing: string[] = [];
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

    // 4. Generate Feedback Suggestions
    const suggestions = [];
    if (totalWords < 150) {
      suggestions.push("Your CV is very short. Add more details about your responsibilities.");
    } else if (totalWords > 1000) {
      suggestions.push("Your CV is too long (over 1000 words). Try to condense it to under two pages.");
    }

    if (actionVerbsFound < 3) {
      suggestions.push("Use more strong action verbs (e.g., spearheaded, optimized, developed) to start your bullet points.");
    }

    if (keywordsFound.size < 5) {
      suggestions.push("Your CV lacks industry-standard keywords. Add more technical and soft skills.");
    }

    if (hasJobDescription && jdOverlapScore < 25) {
      suggestions.push("Your CV is missing critical keywords from the job description. Incorporate the missing skills below.");
    }

    if (keywordsMissing.length > 0) {
      suggestions.push(`Consider adding these missing skills if you have them: ${keywordsMissing.join(", ")}.`);
    }

    let overall_feedback = "";
    if (score >= 80) {
      overall_feedback = "Excellent CV! Highly compatible with ATS systems. Ready to apply.";
    } else if (score >= 60) {
      overall_feedback = "Good CV, but needs some optimization. Review the suggestions to improve your keyword density and alignment.";
    } else {
      overall_feedback = "Your CV requires significant improvements. It may be filtered out by ATS systems. Focus on adding keywords and strong action verbs.";
    }

    const resultPayload = {
      success: true,
      ats_score: score,
      keywords_found: Array.from(keywordsFound),
      keywords_missing: keywordsMissing,
      suggestions: suggestions,
      overall_feedback: overall_feedback
    };

    // Save to DB using schema-compliant columns
    const { error: dbError } = await supabase.from("cvs").insert({
      user_id: user.id,
      extracted_text: cv_text,
      ats_score: resultPayload.ats_score
    });

    if (dbError) {
      console.error("Database insert error:", dbError);
    }

    return jsonResponse(resultPayload);

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});
