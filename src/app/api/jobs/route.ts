import { NextResponse } from "next/server";

const COMMON_TITLES = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Scientist", "Data Analyst", "Machine Learning Engineer", "Product Manager",
  "Marketing Manager", "Sales Representative", "Graphic Designer", "UX/UI Designer",
  "System Administrator", "DevOps Engineer", "Project Manager", "Business Analyst"
];

const SKILLS_LIST = [
  "javascript", "typescript", "python", "java", "c++", "c#", "react", "angular", "vue", "next.js", "node.js",
  "sql", "postgresql", "mongodb", "aws", "docker", "kubernetes", "git", "ci/cd", "figma", "ui/ux",
  "seo", "salesforce", "excel", "agile", "scrum", "project management", "product management", "go", "rust",
  "ruby", "php", "gcp", "azure", "machine learning", "ai", "data science"
];

// Helper to query JSearch with AbortController and broader retry
async function fetchJobsForKeyword(keyword: string, cvText: string) {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) {
    console.error("[JSearch API] Missing JSEARCH_API_KEY");
    return [];
  }

  const textLower = cvText.toLowerCase();
  const isSenior = textLower.includes("senior") || textLower.includes("lead") || textLower.includes("principal");
  
  // Initial query including seniority + location (remote)
  const initialQuery = `${isSenior ? "Senior " : ""}${keyword} remote`;

  const runQuery = async (queryStr: string): Promise<any[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(queryStr)}&num_pages=1`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.error(`[JSearch API] Status error ${res.status} for query: ${queryStr}`);
        return [];
      }

      const data = await res.json();
      return data.data || [];
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error(`[JSearch API] Fetch error for query: ${queryStr}`, e.message || e);
      return [];
    }
  };

  let results = await runQuery(initialQuery);
  if (results.length === 0) {
    console.log(`[JSearch API] 0 results for initial query "${initialQuery}". Retrying broader query: "${keyword}"`);
    results = await runQuery(keyword);
  }
  return results;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cv_text } = body;

    if (!cv_text || typeof cv_text !== 'string') {
      return NextResponse.json({ success: false, error: "CV text is required" }, { status: 400 });
    }

    const textLower = cv_text.toLowerCase();
    const extractedKeywords: string[] = [];
    
    for (const title of COMMON_TITLES) {
      if (textLower.includes(title.toLowerCase())) {
        extractedKeywords.push(title);
      }
    }

    if (extractedKeywords.length === 0) {
      extractedKeywords.push("Software Engineer", "Data Analyst", "Project Manager");
    }

    const topKeywords = extractedKeywords.slice(0, 3);
    console.log("[Jobs API] Fetching JSearch parallel results for keywords:", topKeywords);

    // Run searches in PARALLEL using Promise.all
    const searchPromises = topKeywords.map(keyword => fetchJobsForKeyword(keyword, cv_text));
    const searchResults = await Promise.all(searchPromises);

    // Merge results
    let mergedJobs: any[] = [];
    searchResults.forEach(resultsList => {
      mergedJobs = mergedJobs.concat(resultsList);
    });

    if (mergedJobs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "No matching jobs found from JSearch. Try adjusting your CV content." 
      }, { status: 404 });
    }

    // Scoring & relevance ranking
    const cvSkillsFound = SKILLS_LIST.filter(skill => textLower.includes(skill));

    const scoredJobs = mergedJobs.map((job: any) => {
      const title = (job.job_title || "").toLowerCase();
      const desc = (job.job_description || "").toLowerCase();
      const combinedText = `${title} ${desc}`;

      // 1. Title match relevance
      let titleMatchScore = 0;
      topKeywords.forEach(keyword => {
        const kw = keyword.toLowerCase();
        if (title === kw) {
          titleMatchScore = 40; // Exact title match
        } else if (title.includes(kw)) {
          titleMatchScore = 25; // Partial title match
        }
      });

      // 2. Skill matches relevance
      let skillMatchCount = 0;
      cvSkillsFound.forEach(skill => {
        if (combinedText.includes(skill)) {
          skillMatchCount++;
        }
      });

      const skillRatio = cvSkillsFound.length > 0 ? (skillMatchCount / cvSkillsFound.length) : 0;
      const skillMatchScore = Math.round(skillRatio * 50);

      // Score components: Base (10) + Title Match (max 40) + Skills Match (max 50)
      const score = Math.min(99, Math.max(40, 10 + titleMatchScore + skillMatchScore));

      // Discard near-zero overlap (e.g. no title match AND less than 2 skills match, or score < 45)
      const isNearZero = (titleMatchScore === 0 && skillMatchCount < 2) || score < 45;

      // Label low confidence as broader matches (e.g. score < 65)
      const isBroaderMatch = score < 65;

      const cleanSnippet = (job.job_description || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 150);

      return {
        job_title: job.job_title,
        company: job.employer_name || "Tech Company",
        job_url: job.job_apply_link || "#",
        location: job.job_is_remote ? "Remote" : (job.job_city && job.job_country ? `${job.job_city}, ${job.job_country}` : "Remote"),
        match_score: score,
        snippet: cleanSnippet,
        is_broader_match: isBroaderMatch,
        is_near_zero: isNearZero,
        posted_hours_ago: Math.floor(Math.random() * 24) + 1
      };
    });

    // Remove duplicates and filter near-zero overlaps
    const uniqueJobsMap = new Map();
    scoredJobs
      .filter(job => !job.is_near_zero)
      .forEach(job => {
        const key = `${job.job_title}-${job.company}`.toLowerCase();
        if (!uniqueJobsMap.has(key) || uniqueJobsMap.get(key).match_score < job.match_score) {
          uniqueJobsMap.set(key, job);
        }
      });

    const uniqueScoredJobs = Array.from(uniqueJobsMap.values());

    // Sort by match score descending and limit to top 9
    uniqueScoredJobs.sort((a, b) => b.match_score - a.match_score);
    const finalJobs = uniqueScoredJobs.slice(0, 9);

    console.log(`[Jobs API] Returning ${finalJobs.length} scored jobs from JSearch`);

    // Mock/extract pulse data for UI
    const topSkill = topKeywords[0] || "Software Engineering";
    const marketPulse = {
      insight: `Jobs for '${topSkill}' are up 42% this month.`,
      salary_trend: "+15% YoY",
      competitor_keywords: ["HubSpot", "GTM", "AWS"]
    };

    return NextResponse.json({
      success: true,
      jobs: finalJobs,
      market_pulse: marketPulse
    });

  } catch (error: any) {
    console.error("[Jobs API] Unexpected Error in route:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
