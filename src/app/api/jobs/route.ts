import { NextResponse } from "next/server";

const COMMON_TITLES = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Scientist", "Data Analyst", "Machine Learning Engineer", "Product Manager",
  "Marketing Manager", "Sales Representative", "Graphic Designer", "UX/UI Designer",
  "System Administrator", "DevOps Engineer", "Project Manager", "Business Analyst"
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cv_text } = body;

    if (!cv_text || typeof cv_text !== 'string') {
      return NextResponse.json({ success: false, error: "CV text is required" }, { status: 400 });
    }

    // Heuristically determine job titles/keywords from CV
    const textLower = cv_text.toLowerCase();
    const extractedKeywords: string[] = [];
    
    for (const title of COMMON_TITLES) {
      if (textLower.includes(title.toLowerCase())) {
        extractedKeywords.push(title);
      }
    }

    // Fallbacks
    if (extractedKeywords.length === 0) {
      extractedKeywords.push("Software Engineer", "Data Analyst", "Project Manager");
    }

    const topKeywords = extractedKeywords.slice(0, 3);
    console.log("[Jobs API] Extracted keywords for match:", topKeywords);

    // Call Arbeitnow & Remotive APIs with 15-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const fetchArbeitnow = async () => {
      console.log("[Jobs API] Fetching from Arbeitnow...");
      const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
        method: "GET",
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`Arbeitnow API returned status ${res.status}`);
      }
      const data = await res.json();
      const rawList = data && Array.isArray(data.data) ? data.data : [];
      return rawList.map((job: any) => ({
        title: job.title,
        company_name: job.company_name,
        url: job.url,
        location: job.location || "Remote",
        description: job.description,
        tags: job.tags || [],
        remote: job.remote === true || job.remote === "true"
      }));
    };

    const fetchRemotive = async () => {
      console.log("[Jobs API] Fetching from Remotive...");
      const res = await fetch("https://remotive.com/api/remote-jobs?limit=50", {
        method: "GET",
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`Remotive API returned status ${res.status}`);
      }
      const data = await res.json();
      const rawList = data && Array.isArray(data.jobs) ? data.jobs : [];
      return rawList.map((job: any) => ({
        title: job.title,
        company_name: job.company_name,
        url: job.url,
        location: job.candidate_required_location || job.location || "Remote",
        description: job.description,
        tags: job.tags || [],
        remote: true
      }));
    };

    let rawJobs: any[] = [];
    const results = await Promise.allSettled([fetchArbeitnow(), fetchRemotive()]);
    clearTimeout(timeoutId);

    const errors: string[] = [];
    results.forEach((result, idx) => {
      const apiName = idx === 0 ? "Arbeitnow" : "Remotive";
      if (result.status === "fulfilled") {
        rawJobs = rawJobs.concat(result.value);
        console.log(`[Jobs API] Retrieved ${result.value.length} jobs from ${apiName}`);
      } else {
        console.error(`[Jobs API] ${apiName} API fetch failed:`, result.reason);
        errors.push(`${apiName}: ${result.reason?.message || result.reason}`);
      }
    });

    if (rawJobs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `All job boards are currently unreachable: ${errors.join("; ")}` 
      }, { status: 502 });
    }

    console.log(`[Jobs API] Total raw jobs retrieved from all boards: ${rawJobs.length}`);

    // Helper to calculate keyword overlap score
    const cvWords = new Set(textLower.match(/\b\w+\b/g) || []);
    const calculateScore = (jobDesc: string, jobTitle: string) => {
      const combinedText = `${jobTitle} ${jobDesc}`.toLowerCase();
      const jobWordsArray = combinedText.match(/\b\w+\b/g) || [];
      // Filter out small words and compute overlap
      const jobWords = new Set(jobWordsArray.filter(w => w.length > 4));
      
      if (jobWords.size === 0) return 50;

      let matchCount = 0;
      jobWords.forEach(word => {
        if (cvWords.has(word)) {
          matchCount++;
        }
      });

      const ratio = matchCount / jobWords.size;
      // Map to realistic match score between 45% and 96%
      return Math.min(96, Math.max(45, Math.round(ratio * 100 + 40)));
    };

    // Filter jobs client-side by matching extracted keywords against title, tags, and description
    let filteredJobs = rawJobs.filter((job: any) => {
      const title = (job.title || "").toLowerCase();
      const tags = (job.tags || []).map((t: string) => t.toLowerCase());
      const desc = (job.description || "").toLowerCase();

      return topKeywords.some(keyword => {
        const kw = keyword.toLowerCase();
        return title.includes(kw) || tags.some((t: string) => t.includes(kw)) || desc.includes(kw);
      });
    });

    console.log(`[Jobs API] Jobs matching keywords count: ${filteredJobs.length}`);
    let isFallback = false;

    // Fallback: if fewer than 3 results, get top remote jobs regardless of keyword match
    if (filteredJobs.length < 3) {
      console.log("[Jobs API] Fewer than 3 matching jobs found. Falling back to top remote jobs...");
      isFallback = true;
      filteredJobs = rawJobs.filter((job: any) => job.remote === true || job.remote === "true");
      
      // If still no remote jobs, just use whatever jobs are available
      if (filteredJobs.length === 0) {
        filteredJobs = rawJobs;
      }
    }

    // Map & score jobs
    const scoredJobs = filteredJobs.map((job: any) => {
      const score = calculateScore(job.description || "", job.title || "");
      const finalCompany = isFallback ? `${job.company_name} (Related Opportunity)` : job.company_name;

      // Strip HTML tags from description snippet
      const cleanSnippet = (job.description || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 150);

      return {
        job_title: job.title,
        company: finalCompany,
        job_url: job.url,
        location: job.location || "Remote",
        match_score: score,
        snippet: cleanSnippet
      };
    });

    // Sort by match score descending and limit to top 9
    scoredJobs.sort((a: any, b: any) => b.match_score - a.match_score);
    const finalJobs = scoredJobs.slice(0, 9);

    console.log(`[Jobs API] Returning ${finalJobs.length} scored jobs (isFallback: ${isFallback})`);

    return NextResponse.json({
      success: true,
      jobs: finalJobs
    });

  } catch (error: any) {
    console.error("[Jobs API] Unexpected Error in route:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
