import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ============================================
// EXPANDED NLP ATS ALGORITHM DICTIONARIES
// ============================================
const TECH_SKILLS = [
  // Software / Web Development
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "php", "go", "rust", "swift", "kotlin",
  "react", "angular", "vue", "next.js", "node.js", "express", "django", "flask", "spring", "laravel",
  "sql", "mysql", "postgresql", "mongodb", "redis", "firebase", "supabase", "docker", "kubernetes", "aws", "azure", "gcp",
  "html", "css", "sass", "tailwind", "git", "github", "gitlab", "ci/cd", "agile", "scrum", "machine learning", "ai",
  "data science", "data analysis", "pandas", "numpy", "tensorflow", "pytorch",
  "rest api", "graphql", "microservices", "linux", "bash", "powershell", "terraform", "ansible",
  "jenkins", "circleci", "webpack", "vite", "oauth", "jwt", "ssl", "api gateway",
  
  // Design & Creative
  "figma", "sketch", "photoshop", "illustrator", "indesign", "premiere pro", "after effects",
  "ui/ux", "user experience", "graphic design", "typography", "wireframing", "prototyping",
  
  // Marketing & Sales
  "seo", "sem", "google analytics", "social media", "copywriting", "email marketing", "ppc",
  "digital marketing", "crm", "salesforce", "hubspot", "lead generation", "market research",
  
  // Admin, Office & Customer Support
  "excel", "word", "data entry", "typing", "spreadsheets", "database", "document management",
  "data verification", "transcription", "billing", "invoicing", "filing", "records management",
  "customer service", "helpdesk", "zendesk", "intercom", "telephony",
  
  // HR, HRIS & Recruiting
  "recruiting", "onboarding", "talent acquisition", "hris", "employee relations", "sourcing",
  "performance management", "labor compliance", "workday", "bambooHR",
  
  // Finance & Accounting
  "bookkeeping", "accounting", "quickbooks", "auditing", "financial analysis", "budget forecasting",
  "taxation", "payroll", "sap", "general ledger", "accounts payable", "accounts receivable"
];

const SOFT_SKILLS = [
  "leadership", "communication", "teamwork", "problem solving", "time management", "critical thinking",
  "adaptability", "collaboration", "project management", "organization", "negotiation", "public speaking",
  "conflict resolution", "attention to detail", "stakeholder management"
];

const ACTION_VERBS = [
  "managed", "developed", "led", "created", "designed", "implemented", "improved", "increased", "decreased",
  "spearheaded", "orchestrated", "architected", "optimized", "streamlined", "resolved", "launched", "delivered",
  "executed", "pioneered", "transformed", "automated", "coordinated", "mentored", "negotiated", "facilitated",
  "consolidated", "revamped", "integrated", "migrated", "scaled", "refactored", "tested", "established", "handled"
];

const EXPECTED_SECTIONS = [
  "summary", "experience", "education", "skills", "languages", "projects", "certifications", "awards"
];

const STOP_WORDS = new Set([
  'with', 'that', 'this', 'from', 'have', 'will', 'been', 'your', 'they', 'their', 'about', 
  'would', 'could', 'should', 'these', 'those', 'other', 'some', 'into', 'than', 'more', 
  'also', 'just', 'over', 'such', 'after', 'most', 'only', 'very', 'when', 'what', 'which', 
  'each', 'were', 'make', 'like', 'then', 'them', 'well', 'back', 'work', 'first', 'even', 
  'give', 'must', 'and', 'the', 'for', 'you', 'are', 'but', 'not', 'our', 'out', 'who'
]);

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

    // Calculate General Health Score (Max 100 points)
    // A. Structure Score (Max 20 pts)
    let sectionsFound = 0;
    EXPECTED_SECTIONS.forEach(sec => {
      if (textLower.includes(sec)) sectionsFound++;
    });
    const structureScore = Math.min(20, sectionsFound * 4);

    // B. Action Verbs (Max 20 pts) - 3 pts per verb
    const verbsScore = Math.min(20, actionVerbsFound * 3);

    // C. Quantifiable Achievements (Max 20 pts)
    const numberPattern = /(\d+%\b|\$\d+[kKmM]?\b|\b\d+\+|\b\d+x\b|\b\d+ years?\b|\b\d+ months?\b)/gi;
    const quantifiableMatches = cv_text.match(numberPattern) || [];
    const quantifiableScore = Math.min(20, quantifiableMatches.length * 5);

    // D. Keyword Density (Max 20 pts) - Ideal: 1.2% to 6.0%
    const density = totalWords > 0 ? (keywordHitsCount / totalWords) * 100 : 0;
    let densityScore = 0;
    if (density >= 1.2 && density <= 6.0) {
      densityScore = 20;
    } else if (density > 0.5) {
      densityScore = 10;
    } else if (density > 0) {
      densityScore = 2;
    }

    // E. Formatting & Length (Max 20 pts)
    let lengthScore = 0;
    if (totalWords >= 150 && totalWords <= 800) {
      lengthScore = 20;
    } else if (totalWords >= 100 && totalWords <= 1000) {
      lengthScore = 10;
    } else if (totalWords >= 50) {
      lengthScore = 3;
    }

    const generalHealthScore = structureScore + verbsScore + quantifiableScore + densityScore + lengthScore;

    let score = 0;
    let keywordsMissing: string[] = [];

    const hasJobDescription = job_description && typeof job_description === 'string' && job_description.trim() !== '';

    if (!hasJobDescription) {
      score = generalHealthScore;
      
      const allSkills = [...TECH_SKILLS, ...SOFT_SKILLS];
      keywordsMissing = allSkills
        .filter(skill => !keywordsFound.has(skill))
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

    } else {
      // Job Description Match Mode
      const jdLower = job_description.toLowerCase();
      const jdWords = jdLower.match(/\b\w+\b/g) || [];
      
      const jdTechSkills = new Set<string>();
      TECH_SKILLS.forEach(skill => {
        if (jdLower.includes(skill)) {
          jdTechSkills.add(skill);
        }
      });

      let coreJDRequired: Set<string>;
      if (jdTechSkills.size > 0) {
        coreJDRequired = jdTechSkills;
      } else {
        const customJdTech = new Set<string>();
        jdWords.forEach(w => {
          if (w.length > 4 && 
              !STOP_WORDS.has(w) && 
              !SOFT_SKILLS.includes(w) && 
              !ACTION_VERBS.includes(w)) {
            customJdTech.add(w);
          }
        });
        coreJDRequired = customJdTech;
      }

      const matchedCoreKeywords = new Set<string>();
      coreJDRequired.forEach(keyword => {
        if (textLower.includes(keyword)) {
          matchedCoreKeywords.add(keyword);
        }
      });

      coreJDRequired.forEach(keyword => {
        if (!matchedCoreKeywords.has(keyword) && keywordsMissing.length < 5) {
          keywordsMissing.push(keyword);
        }
      });

      let jdOverlapScore = 0;
      if (coreJDRequired.size === 0) {
        jdOverlapScore = 50;
      } else {
        jdOverlapScore = Math.round((matchedCoreKeywords.size / coreJDRequired.size) * 100);
      }

      // Weighted average: 50% JD Overlap, 50% General ATS Health
      score = Math.round((jdOverlapScore * 0.50) + (generalHealthScore * 0.50));

      // Capped strictly at 25% if there's zero overlap with the core technical requirements
      if (matchedCoreKeywords.size === 0) {
        score = Math.min(score, 25);
      }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    // Generate Suggestions
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

    if (sectionsFound < 3) {
      suggestions.push("Your CV is missing standard sections. Include: Summary, Experience, Education, and Skills.");
    }

    if (quantifiableMatches.length < 2) {
      suggestions.push("Add quantifiable achievements (e.g., 'increased revenue by 25%', 'managed team of 8') to strengthen your impact statements.");
    }

    if (hasJobDescription && score < 40) {
      suggestions.push("Your CV is missing critical technical keywords from the job description. Incorporate the missing skills below.");
    }

    if (keywordsMissing.length > 0) {
      suggestions.push(`Consider adding these missing skills if you have them: ${keywordsMissing.join(", ")}.`);
    }

    let overall_feedback = "";
    if (score >= 80) {
      overall_feedback = "Excellent CV! Highly compatible with ATS systems. Ready to apply.";
    } else if (score >= 60) {
      overall_feedback = "Good CV, but needs some optimization. Review the suggestions to improve your keyword density and alignment.";
    } else if (score >= 40) {
      overall_feedback = "Your CV needs improvement. Focus on adding relevant keywords, quantifiable achievements, and proper section structure.";
    } else {
      overall_feedback = "Your CV requires significant improvements. It may be filtered out by ATS systems. Focus on adding keywords and strong action verbs.";
    }

    // Hiring Manager Simulator
    const hiringManagerObjections = [];
    if (totalWords < 200) hiringManagerObjections.push("Too brief. Doesn't show enough depth of experience for a senior role.");
    if (actionVerbsFound < 5) hiringManagerObjections.push("Lacks impact. I see what you did, but not what you achieved.");
    if (quantifiableMatches.length === 0) hiringManagerObjections.push("No metrics. I need to see numbers to prove your scale.");
    if (hasJobDescription && keywordsMissing.length > 3) hiringManagerObjections.push("Missing core technical requirements listed in the JD.");
    if (hiringManagerObjections.length === 0) hiringManagerObjections.push("Looks solid. I'd definitely bring this candidate in for a phone screen.");

    // Gap & Red Flag Explainer
    const redFlags = [];
    if (totalWords > 800) redFlags.push({ issue: "Lengthy Resume", explanation: "I have over 10 years of detailed experience, but I can provide a 1-page executive summary if needed." });
    if (sectionsFound < 4) redFlags.push({ issue: "Missing Sections", explanation: "I prioritize a functional format focusing on direct impact over traditional structural sections." });
    if (redFlags.length === 0) redFlags.push({ issue: "Clean Profile", explanation: "No major red flags detected." });

    // Skill Graph
    const missingSkillsGraph = keywordsMissing.map(skill => ({
      skill: skill,
      course_suggestion: `Free Codecamp: Advanced ${skill.charAt(0).toUpperCase() + skill.slice(1)}`,
      time_to_close: "2 weeks"
    }));

    const resultPayload = {
      success: true,
      ats_score: score,
      keywords_found: Array.from(keywordsFound),
      keywords_missing: keywordsMissing,
      suggestions: suggestions,
      overall_feedback: overall_feedback,
      hiring_manager_objections: hiringManagerObjections,
      red_flags: redFlags,
      skill_graph: missingSkillsGraph
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
