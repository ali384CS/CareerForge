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
// CUSTOM HEURISTIC FORMATTER (NO EXTERNAL AI)
// ============================================
const WEAK_VERBS = ["helped", "worked", "did", "made", "handled", "was responsible for", "managed to"];
const STRONG_VERBS = ["Spearheaded", "Orchestrated", "Engineered", "Architected", "Streamlined", "Optimized", "Executed"];

const SECTIONS_MAP = {
  "PROFESSIONAL SUMMARY": "PROFESSIONAL SUMMARY",
  "SUMMARY": "PROFESSIONAL SUMMARY",
  "OBJECTIVE": "PROFESSIONAL SUMMARY",
  
  "TECHNICAL SKILLS": "CORE SKILLS",
  "SKILLS": "CORE SKILLS",
  "KEY SKILLS": "CORE SKILLS",
  "CORE COMPETENCIES": "CORE SKILLS",
  "CORE SKILLS": "CORE SKILLS",
  
  "EDUCATION": "EDUCATION",
  
  "WORK EXPERIENCE": "PROJECTS / EXPERIENCE",
  "EXPERIENCE": "PROJECTS / EXPERIENCE",
  "PROJECTS": "PROJECTS / EXPERIENCE",
  "PROJECTS / EXPERIENCE": "PROJECTS / EXPERIENCE",
  
  "LANGUAGES": "LANGUAGES",
  
  "CERTIFICATIONS": "CERTIFICATIONS",
  "AWARDS": "CERTIFICATIONS",
  "ACHIEVEMENTS": "CERTIFICATIONS"
};

const ALL_SKILLS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "php", "go", "rust", "swift", "kotlin",
  "react", "angular", "vue", "next.js", "node.js", "express", "django", "flask", "spring", "laravel",
  "sql", "mysql", "postgresql", "mongodb", "redis", "firebase", "supabase", "docker", "kubernetes", "aws", "azure", "gcp",
  "html", "css", "sass", "tailwind", "git", "github", "gitlab", "ci/cd", "agile", "scrum", "machine learning", "ai",
  "data science", "data analysis", "pandas", "numpy", "tensorflow", "pytorch",
  "leadership", "communication", "teamwork", "problem solving", "time management", "critical thinking",
  "adaptability", "collaboration", "project management", "organization"
];

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
    const { cv_text, job_description, instruction } = reqBody;

    if (!cv_text || typeof cv_text !== 'string' || cv_text.trim() === '') {
      return jsonResponse({ success: false, error: "CV text is required" }, 400);
    }

    if (!job_description || typeof job_description !== 'string' || job_description.trim().length < 50) {
      return jsonResponse({ success: false, error: "Job description is required (minimum 50 characters)" }, 400);
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
    // RULE-BASED OPTIMIZATION & FORMATTING LOGIC
    // ============================================
    let optimizedText = cv_text;
    const changes: string[] = [];

    if (instruction && typeof instruction === 'string') {
      changes.push(`Custom refinement: ${instruction}`);
      if (instruction.toLowerCase().includes("remove") || instruction.toLowerCase().includes("delete")) {
        const match = instruction.match(/(?:remove|delete)\s+(\w+)/i);
        if (match && match[1]) {
          const wordToRemove = match[1];
          const regex = new RegExp(`\\b${wordToRemove}\\b`, 'gi');
          optimizedText = optimizedText.replace(regex, "");
          changes.push(`Removed references to "${wordToRemove}"`);
        }
      }
      optimizedText = `[Refined with feedback: ${instruction.replace("Apply this specific change: ", "")}]\n\n` + optimizedText;
    }

    // 1. Remove any accidental markdown
    optimizedText = optimizedText.replace(/^#{1,6}\s*/gm, '');
    optimizedText = optimizedText.replace(/\*\*/g, '');
    optimizedText = optimizedText.replace(/__/g, '');

    // 2. Format Section Headers (map custom/varied headers to mandatory ALL CAPS sections)
    const sortedKeys = Object.keys(SECTIONS_MAP).sort((a, b) => b.length - a.length);
    const escapedKeys = sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    
    // Match headers strictly at the start of a line (or after a newline), optionally followed by a colon and spaces, before a newline or end of text.
    const pattern = new RegExp(`(^|\\r?\\n)\\s*(${escapedKeys.join('|')})\\s*(?::|\\r?\\n|$)`, 'gi');
    
    optimizedText = optimizedText.replace(pattern, (match, before, p2) => {
      const key = p2.toUpperCase() as keyof typeof SECTIONS_MAP;
      return `${before}\n\n${SECTIONS_MAP[key]}\n`;
    });

    // 3. Reconstruct Bullet Points using SINGLE DASH (-) instead of asterisks or dots
    if (optimizedText.includes("•")) {
      optimizedText = optimizedText.replace(/•\s*/g, `\n- `);
      changes.push("Formatted bullet points using a single dash.");
    }
    
    // Also convert any standalone * bullets to -
    optimizedText = optimizedText.replace(/^\s*\*\s+/gm, '- ');

    // 4. Replace weak verbs with strong verbs
    WEAK_VERBS.forEach((weakWord, index) => {
      const regex = new RegExp(`\\b${weakWord}\\b`, 'gi');
      if (regex.test(optimizedText)) {
        const strongWord = STRONG_VERBS[index % STRONG_VERBS.length];
        optimizedText = optimizedText.replace(regex, strongWord);
        changes.push(`Upgraded action verb: "${weakWord}" → "${strongWord}"`);
      }
    });

    // 5. Fix broken hyphens — collapse " - " to "-" only within URL-like/slug contexts
    optimizedText = optimizedText.replace(/(https?:\/\/[^\s]*?)\s+-\s+/g, '$1-');
    // Fix name-like broken hyphens (lowercase-lowercase pattern)
    optimizedText = optimizedText.replace(/([a-z])\s+-\s+([a-z])/gi, (match, p1, p2) => {
      if (/[a-z]/.test(p1) && /[a-z]/.test(p2)) {
        return `${p1}-${p2}`;
      }
      return match;
    });

    // ============================================
    // 6. JOB DESCRIPTION-AWARE OPTIMIZATION
    // ============================================
    const jdLower = job_description.toLowerCase();
    const cvLower = optimizedText.toLowerCase();

    // Extract skills mentioned in JD but missing from CV
    const jdSkills: string[] = [];
    const missingSkills: string[] = [];

    ALL_SKILLS.forEach(skill => {
      if (jdLower.includes(skill)) {
        jdSkills.push(skill);
        if (!cvLower.includes(skill)) {
          missingSkills.push(skill);
        }
      }
    });

    // Extract key phrases from JD (words that appear frequently)
    const jdWords = jdLower.match(/\b\w{4,}\b/g) || [];
    const wordFreq: Record<string, number> = {};
    jdWords.forEach(w => {
      if (!['with', 'that', 'this', 'from', 'have', 'will', 'been', 'your', 'they', 'their', 'about', 'would', 'could', 'should', 'these', 'those', 'other', 'some', 'into', 'than', 'more', 'also', 'just', 'over', 'such', 'after', 'most', 'only', 'very', 'when', 'what', 'which', 'each', 'were', 'make', 'like', 'then', 'them', 'well', 'back', 'work', 'first', 'even', 'give', 'must'].includes(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });

    const keyTerms = Object.entries(wordFreq)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);

    // If there are missing skills, append to CORE SKILLS
    if (missingSkills.length > 0) {
      const skillLine = `\n- ${missingSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}`;
      
      if (cvLower.includes('core skills')) {
        const idx = optimizedText.toUpperCase().indexOf('CORE SKILLS');
        if (idx !== -1) {
          let nextSectionIdx = optimizedText.length;
          const sections = ["CORE SKILLS", "EDUCATION", "PROJECTS / EXPERIENCE", "LANGUAGES", "CERTIFICATIONS"];
          for (const sec of sections) {
            if (sec === 'CORE SKILLS') continue;
            const sidx = optimizedText.toUpperCase().indexOf(sec, idx + 11);
            if (sidx !== -1 && sidx < nextSectionIdx) {
              nextSectionIdx = sidx;
            }
          }
          optimizedText = optimizedText.slice(0, nextSectionIdx) + skillLine + '\n' + optimizedText.slice(nextSectionIdx);
          changes.push(`Added JD-relevant skills to Core Skills: ${missingSkills.join(', ')}`);
        }
      } else {
        optimizedText += `\n\nCORE SKILLS\n- ${missingSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}`;
        changes.push(`Added CORE SKILLS section: ${missingSkills.join(', ')}`);
      }
    }

    const missingTerms = keyTerms.filter(t => !cvLower.includes(t));
    if (missingTerms.length > 0) {
      changes.push(`JD emphasizes these terms: ${missingTerms.join(', ')}`);
    }
    changes.push("Optimization tailored to the job description.");

    // 7. Clean up spacing
    optimizedText = optimizedText.replace(/\n{3,}/g, '\n\n');

    const resultPayload = {
      success: true,
      optimized_cv_text: optimizedText.trim(),
      changes_made: changes
    };

    return jsonResponse(resultPayload);

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});
