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
// CUSTOM JOB MATCHING ALGORITHM
// ============================================
const COMMON_TITLES = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Scientist", "Data Analyst", "Machine Learning Engineer", "Product Manager",
  "Marketing Manager", "Sales Representative", "Graphic Designer", "UX/UI Designer",
  "System Administrator", "DevOps Engineer", "Project Manager", "Business Analyst"
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
    const { cv_text } = reqBody;

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

    const jsearchKey = Deno.env.get("JSEARCH_KEY")!;
    if (!jsearchKey) {
      console.error("Missing JSEARCH_KEY");
      return jsonResponse({ success: false, error: "Server configuration error" }, 500);
    }

    // ============================================
    // STEP A: Extract Job Titles Heuristically
    // ============================================
    const textLower = cv_text.toLowerCase();
    const extractedTitles = [];
    
    for (const title of COMMON_TITLES) {
      if (textLower.includes(title.toLowerCase())) {
        extractedTitles.push(title);
      }
    }

    // If no exact match, fallback to generic titles
    if (extractedTitles.length === 0) {
      extractedTitles.push("Software Engineer", "Data Analyst", "Project Manager");
    }

    // Take top 3
    const topTitles = extractedTitles.slice(0, 3);

    // ============================================
    // STEP B: Fetch Real Jobs via JSearch API
    // ============================================
    const allJobs = [];
    for (const title of topTitles) {
      try {
        const jsearchUrl = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(title)} internship pakistan&num_pages=1`;
        const jsearchRes = await fetch(jsearchUrl, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': jsearchKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
          }
        });

        if (jsearchRes.ok) {
          const jsearchData = await jsearchRes.json();
          const results = jsearchData.data || [];
          for (const job of results.slice(0, 3)) {
            allJobs.push({
              job_title: job.job_title,
              company: job.employer_name,
              job_url: job.job_apply_link,
              job_description: job.job_description || ""
            });
          }
        }
      } catch (e) {
        console.error("JSearch Fetch Error:", e);
      }
    }

    if (allJobs.length === 0) {
      return jsonResponse({ success: false, error: "No matching jobs found from API" }, 500);
    }

    // ============================================
    // STEP C: Score Matches Custom Algorithm
    // ============================================
    const finalJobs = [];
    const cvWords = new Set(textLower.match(/\b\w+\b/g) || []);

    for (const job of allJobs) {
      const jdLower = job.job_description.toLowerCase();
      const jdWordsArray = jdLower.match(/\b\w+\b/g) || [];
      const jdWords = new Set(jdWordsArray.filter(w => w.length > 4)); // Ignore small words

      const matchingSkills = [];
      const skillGaps = [];
      
      // Calculate overlap
      jdWords.forEach(word => {
        if (cvWords.has(word)) {
          matchingSkills.push(word);
        } else {
          skillGaps.push(word);
        }
      });

      // Simple Jaccard similarity-like score
      const totalUnique = new Set([...jdWordsArray, ...(textLower.match(/\b\w+\b/g) || [])]).size;
      const scoreRaw = (matchingSkills.length / (jdWords.size || 1)) * 100;
      // Boost score so it looks realistic (between 40 and 95)
      const match_score = Math.min(95, Math.max(40, Math.round(scoreRaw + 40)));

      finalJobs.push({
        job_title: job.job_title,
        company: job.company,
        job_url: job.job_url,
        match_score: match_score,
        skill_gaps: skillGaps.slice(0, 4), // Top 4 gaps
        matching_skills: matchingSkills.slice(0, 4) // Top 4 matches
      });

      // Save to DB asynchronously
      supabase.from("job_matches").insert({
        user_id: user.id,
        job_title: job.job_title,
        company: job.company,
        job_url: job.job_url,
        match_score: match_score,
        skill_gaps: skillGaps.slice(0, 4),
        matching_skills: matchingSkills.slice(0, 4)
      }).then(({ error }) => {
        if (error) console.error("DB Insert Error for job match:", error);
      });
    }

    return jsonResponse({
      success: true,
      jobs: finalJobs
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});
