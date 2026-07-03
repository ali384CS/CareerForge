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
// CV GENERATOR — Builds ATS-optimized CV from structured data
// Pure heuristic text assembly (no external AI API needed)
// ============================================

const STRONG_SUMMARY_OPENERS = [
  "Results-driven",
  "Detail-oriented",
  "Highly motivated",
  "Innovative",
  "Dedicated",
  "Experienced",
  "Passionate"
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
    const {
      full_name,
      email,
      phone,
      linkedin,
      github,
      summary,
      skills,
      languages,
      education,
      experience,
      target_job_description
    } = reqBody;

    if (!full_name || typeof full_name !== 'string' || full_name.trim() === '') {
      return jsonResponse({ success: false, error: "Full name is required" }, 400);
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
    // BUILD CV TEXT
    // ============================================
    const lines: string[] = [];

    // Header: Name
    lines.push(full_name.toUpperCase());
    
    // Contact line
    const contactParts: string[] = [];
    if (email) contactParts.push(email);
    if (phone) contactParts.push(phone);
    if (linkedin) contactParts.push(linkedin);
    if (github) contactParts.push(github);
    if (contactParts.length > 0) {
      lines.push(contactParts.join(' | '));
    }
    lines.push('');

    // Professional Summary
    lines.push('PROFESSIONAL SUMMARY');
    if (summary && summary.trim()) {
      lines.push(summary.trim());
    } else {
      // Auto-generate summary
      const opener = STRONG_SUMMARY_OPENERS[Math.floor(Math.random() * STRONG_SUMMARY_OPENERS.length)];
      let autoSummary = `${opener} professional`;
      
      if (experience && experience.length > 0 && experience[0].title) {
        autoSummary += ` with experience as ${experience[0].title}`;
        if (experience[0].company) {
          autoSummary += ` at ${experience[0].company}`;
        }
      }

      if (skills && skills.trim()) {
        const skillList = skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (skillList.length > 0) {
          const topSkills = skillList.slice(0, 4).join(', ');
          autoSummary += `. Proficient in ${topSkills}`;
        }
      }

      if (target_job_description && target_job_description.trim()) {
        const jdLower = target_job_description.toLowerCase();
        const roleWords = jdLower.match(/\b(engineer|developer|analyst|designer|manager|lead|architect|scientist|specialist|consultant)\b/g);
        if (roleWords && roleWords.length > 0) {
          const uniqueRoles = [...new Set(roleWords)];
          autoSummary += `, seeking to leverage expertise in a ${uniqueRoles[0]} role`;
        }
      }

      autoSummary += ". Committed to delivering high-quality results and continuous professional growth.";
      lines.push(autoSummary);
    }
    lines.push('');

    // Core Skills
    if (skills && skills.trim()) {
      lines.push('CORE SKILLS');
      const skillList = skills.split(',').map((s: string) => s.trim()).filter(Boolean);
      
      const techList: string[] = [];
      const toolList: string[] = [];
      const softList: string[] = [];

      skillList.forEach(skill => {
        const lower = skill.toLowerCase();
        if (["git", "github", "docker", "kubernetes", "aws", "azure", "gcp", "mysql", "postgresql", "mongodb", "redis", "firebase", "supabase", "jira"].some(t => lower.includes(t))) {
          toolList.push(skill);
        } else if (["communication", "leadership", "teamwork", "problem", "management", "organization", "agile", "scrum"].some(s => lower.includes(s))) {
          softList.push(skill);
        } else {
          techList.push(skill);
        }
      });

      if (techList.length > 0) lines.push(`Technologies: ${techList.join(', ')}`);
      if (toolList.length > 0) lines.push(`Tools & Databases: ${toolList.join(', ')}`);
      if (softList.length > 0) lines.push(`Professional: ${softList.join(', ')}`);
      if (techList.length === 0 && toolList.length === 0 && softList.length === 0) {
        lines.push(`General Skills: ${skillList.join(', ')}`);
      }
      lines.push('');
    }

    // Education
    if (education && education.length > 0) {
      const validEducation = education.filter((e: any) => e.degree || e.institution);
      if (validEducation.length > 0) {
        lines.push('EDUCATION');
        for (const edu of validEducation) {
          const degreeStr = edu.degree || "Degree";
          const instStr = edu.institution || "Institution";
          const yearStr = edu.year || "Year";
          lines.push(`${degreeStr} | ${instStr} | ${yearStr}`);
        }
        lines.push('');
      }
    }

    // Projects / Experience
    if (experience && experience.length > 0) {
      const validExperience = experience.filter((e: any) => e.title || e.company || e.bullets);
      if (validExperience.length > 0) {
        lines.push('PROJECTS / EXPERIENCE');
        for (const exp of validExperience) {
          const displayTitle = exp.company ? `${exp.title} (${exp.company})` : exp.title;
          const displayDate = exp.date || "Present";
          lines.push(`${displayTitle} | ${displayDate}`);
          
          if (exp.bullets) {
            const bulletLines = exp.bullets.split('\n').filter((b: string) => b.trim());
            for (const bullet of bulletLines) {
              const trimmed = bullet.trim();
              if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
                lines.push(`- ${trimmed.replace(/^[-•]\s*/, '')}`);
              } else {
                lines.push(`- ${trimmed}`);
              }
            }
          }
          lines.push('');
        }
      }
    }

    // Languages
    if (languages && languages.trim()) {
      lines.push('LANGUAGES');
      const langList = languages.split(',').map((l: string) => l.trim()).filter(Boolean);
      for (const lang of langList) {
        if (lang.includes('-')) {
          lines.push(lang);
        } else {
          lines.push(`${lang} - Professional`);
        }
      }
      lines.push('');
    }

    const cvText = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    return jsonResponse({
      success: true,
      cv_text: cvText
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});
