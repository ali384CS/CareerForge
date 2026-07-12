import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

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
    const { cv_id, job_description, instruction } = reqBody;

    if (!cv_id) {
      return jsonResponse({ success: false, error: "cv_id is required" }, 400);
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

    // Fetch the parsed text of the CV
    console.log(`Fetching CV text for optimization: ${cv_id}`);
    const { data: cvRecord, error: cvError } = await supabase
      .from("cvs")
      .select("parsed_text")
      .eq("id", cv_id)
      .eq("user_id", user.id)
      .single();

    if (cvError || !cvRecord) {
      console.error("Fetch CV error:", cvError);
      return jsonResponse({ success: false, error: "CV not found or access denied" }, 404);
    }

    const cv_text = cvRecord.parsed_text || "";
    if (!cv_text.trim()) {
      return jsonResponse({ success: false, error: "CV text is empty" }, 400);
    }

    // ============================================
    // RULE-BASED OPTIMIZATION & FORMATTING LOGIC
    // ============================================
    let optimizedText = cv_text;
    const ruleChanges: string[] = [];

    if (instruction && typeof instruction === 'string') {
      ruleChanges.push(`Custom refinement: ${instruction}`);
      if (instruction.toLowerCase().includes("remove") || instruction.toLowerCase().includes("delete")) {
        const match = instruction.match(/(?:remove|delete)\s+(\w+)/i);
        if (match && match[1]) {
          const wordToRemove = match[1];
          const regex = new RegExp(`\\b${wordToRemove}\\b`, 'gi');
          optimizedText = optimizedText.replace(regex, "");
          ruleChanges.push(`Removed references to "${wordToRemove}"`);
        }
      }
      optimizedText = `[Refined with feedback: ${instruction.replace("Apply this specific change: ", "")}]\n\n` + optimizedText;
    }

    // Remove accidental markdown
    optimizedText = optimizedText.replace(/^#{1,6}\s*/gm, '');
    optimizedText = optimizedText.replace(/\*\*/g, '');
    optimizedText = optimizedText.replace(/__/g, '');

    // Format Section Headers
    const sortedKeys = Object.keys(SECTIONS_MAP).sort((a, b) => b.length - a.length);
    const escapedKeys = sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\5]/g, '\\$&'));
    const pattern = new RegExp(`(^|\\r?\\n)\\s*(${escapedKeys.join('|')})\\s*(?::|\\r?\\n|$)`, 'gi');
    optimizedText = optimizedText.replace(pattern, (match, before, p2) => {
      const key = p2.toUpperCase() as keyof typeof SECTIONS_MAP;
      return `${before}\n\n${SECTIONS_MAP[key]}\n`;
    });

    // Reconstruct Bullet Points using SINGLE DASH (-)
    if (optimizedText.includes("•")) {
      optimizedText = optimizedText.replace(/•\s*/g, `\n- `);
      ruleChanges.push("Formatted bullet points using a single dash.");
    }
    optimizedText = optimizedText.replace(/^\s*\*\s+/gm, '- ');

    // Replace weak verbs with strong verbs
    WEAK_VERBS.forEach((weakWord, index) => {
      const regex = new RegExp(`\\b${weakWord}\\b`, 'gi');
      if (regex.test(optimizedText)) {
        const strongWord = STRONG_VERBS[index % STRONG_VERBS.length];
        optimizedText = optimizedText.replace(regex, strongWord);
        ruleChanges.push(`Upgraded action verb: "${weakWord}" → "${strongWord}"`);
      }
    });

    // Fix broken hyphens inside slugs/URLs
    optimizedText = optimizedText.replace(/(https?:\/\/[^\s]*?)\s+-\s+/g, '$1-');
    optimizedText = optimizedText.replace(/([a-z])\s+-\s+([a-z])/gi, (match, p1, p2) => {
      if (/[a-z]/.test(p1) && /[a-z]/.test(p2)) {
        return `${p1}-${p2}`;
      }
      return match;
    });

    // Extract skills mentioned in JD but missing from CV
    const jdLower = job_description.toLowerCase();
    const cvLower = optimizedText.toLowerCase();
    const missingSkills: string[] = [];

    ALL_SKILLS.forEach(skill => {
      if (jdLower.includes(skill) && !cvLower.includes(skill)) {
        missingSkills.push(skill);
      }
    });

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
          ruleChanges.push(`Added JD-relevant skills to Core Skills: ${missingSkills.join(', ')}`);
        }
      } else {
        optimizedText += `\n\nCORE SKILLS\n- ${missingSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}`;
        ruleChanges.push(`Added CORE SKILLS section: ${missingSkills.join(', ')}`);
      }
    }

    optimizedText = optimizedText.replace(/\n{3,}/g, '\n\n').trim();

    // ============================================
    // GEMINI ACTIONABLE SUGGESTIONS GENERATOR
    // ============================================
    console.log("Calling Gemini for actionable improvement suggestions...");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    let suggestions = [];

    if (geminiApiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert recruiter and resume coach. Review the CV text and the target job description. Generate a JSON list of 4-6 specific, actionable, and role-specific suggestions to optimize their CV. Ensure suggestions address metrics, keywords, or structure gaps.

Target Job Description:
${job_description}

CV Text:
${cv_text}

Respond ONLY with a JSON array of objects. Do not wrap it in markdown block tags (like \`\`\`json). The JSON array must look like this:
[
  { "category": "Impact/Keywords/Formatting/Skills", "issue": "Brief description of weakness", "recommendation": "Rewrite or action suggestion" }
]`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (geminiRes.ok) {
          const resData = await geminiRes.json();
          const jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
          suggestions = JSON.parse(jsonText);
        } else {
          console.warn("Gemini suggestions fetch failed:", await geminiRes.text());
        }
      } catch (geminiError) {
        console.error("Gemini suggestions error:", geminiError);
      }
    }

    // Fallback suggestions if Gemini failed
    if (suggestions.length === 0) {
      suggestions = ruleChanges.map(change => ({
        category: "Rule-Based Optimizer",
        issue: "Formatting alignment check",
        recommendation: change
      }));
      if (suggestions.length === 0) {
        suggestions.push({
          category: "General",
          issue: "Unoptimized metrics",
          recommendation: "Ensure achievements list metrics (e.g. revenue, load times, team size)."
        });
      }
    }

    // ============================================
    // SAVE OPTIMIZED VERSION TO DATABASE
    // ============================================
    console.log("Saving optimized CV to public.optimized_cvs...");
    const { data: optData, error: optError } = await supabase
      .from("optimized_cvs")
      .insert({
        cv_id: cv_id,
        job_description: job_description,
        optimized_text: optimizedText,
        suggestions: suggestions
      })
      .select("id")
      .single();

    if (optError || !optData) {
      console.error("Database insert error in optimized_cvs:", optError);
      return jsonResponse({ success: false, error: "Failed to save optimized CV to database" }, 500);
    }

    return jsonResponse({
      success: true,
      optimized_cv_id: optData.id,
      optimized_cv_text: optimizedText,
      changes_made: suggestions
    });

  } catch (err: any) {
    console.error("Unexpected error in optimize-cv:", err);
    return jsonResponse({ success: false, error: err.message || "Internal server error" }, 500);
  }
});
