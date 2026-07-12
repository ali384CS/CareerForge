import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { getDomainSkills } from "../analyze-cv/skills.ts";

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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s#\+\.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function calculateCosineSimilarity(
  cvText: string,
  jdText: string,
  techSkills: string[],
  softSkills: string[]
): { 
  cosSim: number; 
  matchedTech: string[]; 
  missingTech: string[];
  matchedSoft: string[];
  missingSoft: string[];
  jdTechRequired: string[];
  jdSoftRequired: string[];
} {
  const cvLower = cvText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  const jdTechRequired = techSkills.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(jdLower);
  });

  const jdSoftRequired = softSkills.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(jdLower);
  });

  const matchedTech = jdTechRequired.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(cvLower);
  });

  const missingTech = jdTechRequired.filter(skill => !matchedTech.includes(skill));

  const matchedSoft = jdSoftRequired.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(cvLower);
  });

  const missingSoft = jdSoftRequired.filter(skill => !matchedSoft.includes(skill));

  const cvTokens = tokenize(cvText);
  const jdTokens = tokenize(jdText);

  const uniqueTerms = new Set([...cvTokens, ...jdTokens]);
  const df: Record<string, number> = {};
  uniqueTerms.forEach(term => {
    let count = 0;
    if (cvTokens.includes(term)) count++;
    if (jdTokens.includes(term)) count++;
    df[term] = count;
  });

  const idf: Record<string, number> = {};
  uniqueTerms.forEach(term => {
    idf[term] = Math.log(1 + 2 / df[term]);
    if (softSkills.includes(term)) {
      idf[term] *= 0.3;
    }
    if (techSkills.includes(term) || jdTechRequired.includes(term) || matchedTech.includes(term)) {
      idf[term] *= 2.0;
    }
  });

  const getTfIdfVector = (tokens: string[]): Record<string, number> => {
    const tf: Record<string, number> = {};
    tokens.forEach(t => {
      tf[t] = (tf[t] || 0) + 1;
    });

    const tfidf: Record<string, number> = {};
    Object.keys(tf).forEach(t => {
      tfidf[t] = tf[t] * (idf[t] || 1);
    });
    return tfidf;
  };

  const vectorCv = getTfIdfVector(cvTokens);
  const vectorJd = getTfIdfVector(jdTokens);

  let dotProduct = 0;
  let normCv = 0;
  let normJd = 0;

  uniqueTerms.forEach(term => {
    const valCv = vectorCv[term] || 0;
    const valJd = vectorJd[term] || 0;
    dotProduct += valCv * valJd;
    normCv += valCv * valCv;
    normJd += valJd * valJd;
  });

  const cosSim = (normCv > 0 && normJd > 0) ? (dotProduct / (Math.sqrt(normCv) * Math.sqrt(normJd))) : 0;

  return { 
    cosSim, 
    matchedTech, 
    missingTech, 
    matchedSoft, 
    missingSoft,
    jdTechRequired,
    jdSoftRequired
  };
}

async function fetchCompanyInfo(companyName: string, apiKey?: string): Promise<string> {
  if (!apiKey || !companyName) {
    return "";
  }
  try {
    const query = encodeURIComponent(`${companyName} tech stack jobs careers`);
    const url = `https://www.searchapi.io/api/v1/search?engine=google&q=${query}&api_key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("SearchApi request failed with status:", response.status);
      return "";
    }
    const data = await response.json();
    const snippets: string[] = [];
    if (data.organic_results && Array.isArray(data.organic_results)) {
      data.organic_results.forEach((item: any) => {
        if (item.title) snippets.push(item.title);
        if (item.snippet) snippets.push(item.snippet);
      });
    }
    return snippets.join("\n");
  } catch (e) {
    console.error("Error fetching company info from SearchApi:", e);
    return "";
  }
}

function extractCompanyProfile(
  searchText: string,
  techSkills: string[],
  softSkills: string[],
  companyName: string
) {
  const textLower = searchText.toLowerCase();
  
  const detectedTech = new Set<string>();
  techSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(textLower)) {
      detectedTech.add(skill);
    }
  });

  const detectedSoft = new Set<string>();
  softSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(textLower)) {
      detectedSoft.add(skill);
    }
  });

  let requiredExperience = 3;
  const expPatterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
    /experience\s+of\s+(\d+)\+?\s*years?/gi,
    /(\d+)\+?\s*yrs?/gi,
    /requirements?:\s*(\d+)\+?\s*years?/gi
  ];

  for (const pattern of expPatterns) {
    let match;
    while ((match = pattern.exec(searchText)) !== null) {
      const years = parseInt(match[1]);
      if (years > 0 && years <= 15) {
        requiredExperience = years;
        break;
      }
    }
  }

  return {
    name: companyName,
    detected_tech_stack: Array.from(detectedTech),
    detected_soft_skills: Array.from(detectedSoft),
    required_experience: requiredExperience
  };
}

function estimateUserExperience(cvText: string): number {
  const textLower = cvText.toLowerCase();
  
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
    /(\d+)\+?\s*yrs?\s+(?:of\s+)?experience/gi,
    /(\d+)\+?\s*years?\s+in/gi,
    /worked\s+for\s+(\d+)\+?\s*years?/gi
  ];

  let maxYears = 0;
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(textLower)) !== null) {
      const years = parseInt(match[1]);
      if (years > maxYears && years <= 40) {
        maxYears = years;
      }
    }
  }

  if (maxYears === 0) {
    const yearPattern = /\b(20\d{2})\b/g;
    const yearsFound: number[] = [];
    let match;
    while ((match = yearPattern.exec(cvText)) !== null) {
      yearsFound.push(parseInt(match[1]));
    }
    if (yearsFound.length > 0) {
      const minYear = Math.min(...yearsFound);
      const maxYear = Math.max(...yearsFound);
      const diff = maxYear - minYear;
      if (diff > 0 && diff <= 30) {
        maxYears = diff;
      }
    }
  }

  return maxYears > 0 ? maxYears : 1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const reqBody = await req.json();
    const { cv_id, job_description, domain, role_type, company_name, company_location } = reqBody;

    if (!cv_id) {
      return jsonResponse({ success: false, error: "cv_id is required" }, 400);
    }

    // Fetch parsed_text from DB
    console.log(`Fetching CV with ID: ${cv_id} for user: ${user.id}`);
    const { data: cvRecord, error: cvError } = await supabase
      .from("cvs")
      .select("parsed_text, filename")
      .eq("id", cv_id)
      .eq("user_id", user.id)
      .single();

    if (cvError || !cvRecord) {
      console.error("CV Fetch error:", cvError);
      return jsonResponse({ success: false, error: "CV not found or access denied" }, 404);
    }

    const cv_text = cvRecord.parsed_text || "";
    if (!cv_text.trim()) {
      return jsonResponse({ success: false, error: "CV parsed text is empty" }, 400);
    }

    const { tech: techSkills, soft: softSkills } = getDomainSkills(domain, role_type);

    const textLower = cv_text.toLowerCase();
    const words = textLower.match(/\b\w+\b/g) || [];
    const totalWords = words.length;

    // 1. Keyword Extraction
    const keywordsFound = new Set<string>();
    let actionVerbsFound = 0;
    let keywordHitsCount = 0;

    techSkills.forEach(skill => {
      if (textLower.includes(skill)) {
        keywordsFound.add(skill);
        const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
        const matches = textLower.match(regex);
        if (matches) {
          keywordHitsCount += matches.length;
        }
      }
    });

    softSkills.forEach(skill => {
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

    // Structure and Health Scores
    let sectionsFound = 0;
    EXPECTED_SECTIONS.forEach(sec => {
      if (textLower.includes(sec)) sectionsFound++;
    });
    const structureScore = Math.min(20, sectionsFound * 4);
    const verbsScore = Math.min(20, actionVerbsFound * 3);

    const numberPattern = /(\d+%\b|\$\d+[kKmM]?\b|\b\d+\+|\b\d+x\b|\b\d+ years?\b|\b\d+ months?\b)/gi;
    const quantifiableMatches = cv_text.match(numberPattern) || [];
    const quantifiableScore = Math.min(20, quantifiableMatches.length * 5);

    const density = totalWords > 0 ? (keywordHitsCount / totalWords) * 100 : 0;
    let densityScore = 0;
    if (density >= 1.2 && density <= 6.0) {
      densityScore = 20;
    } else if (density > 0.5) {
      densityScore = 10;
    } else if (density > 0) {
      densityScore = 2;
    }

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
      const allSkills = [...techSkills, ...softSkills];
      keywordsMissing = allSkills
        .filter(skill => !keywordsFound.has(skill))
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
    } else {
      const {
        cosSim,
        matchedTech,
        missingTech,
        matchedSoft,
        missingSoft,
        jdTechRequired,
        jdSoftRequired
      } = calculateCosineSimilarity(cv_text, job_description, techSkills, softSkills);

      const foundSkills = [...matchedTech, ...matchedSoft];
      foundSkills.forEach(s => keywordsFound.add(s));
      keywordsMissing = [...missingTech, ...missingSoft].slice(0, 8);

      const techRatio = jdTechRequired.length > 0 ? (matchedTech.length / jdTechRequired.length) : 1.0;
      const softRatio = jdSoftRequired.length > 0 ? (matchedSoft.length / jdSoftRequired.length) : 1.0;

      const weightedScore = (techRatio * 65) + (cosSim * 25) + (softRatio * 10);
      score = Math.round(weightedScore);

      if (jdTechRequired.length > 0 && matchedTech.length === 0) {
        score = Math.min(score, 30);
      } else if (jdTechRequired.length > 0 && techRatio < 0.15) {
        score = Math.min(score, 34);
      }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    // Generate Recommendations
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
      suggestions.push("Add quantifiable achievements to strengthen your impact statements.");
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
      overall_feedback = "Good CV, but needs some optimization. Review the suggestions to improve keyword density and alignment.";
    } else if (score >= 40) {
      overall_feedback = "Your CV needs improvement. Focus on adding relevant keywords, quantifiable achievements, and proper structure.";
    } else {
      overall_feedback = "Your CV requires significant improvements. It may be filtered out by ATS. Focus on adding keywords and strong action verbs.";
    }

    const hiringManagerObjections = [];
    if (totalWords < 200) hiringManagerObjections.push("Too brief. Doesn't show enough depth of experience.");
    if (actionVerbsFound < 5) hiringManagerObjections.push("Lacks impact. I see what you did, but not what you achieved.");
    if (quantifiableMatches.length === 0) hiringManagerObjections.push("No metrics. I need to see numbers to prove your scale.");
    if (hasJobDescription && keywordsMissing.length > 3) hiringManagerObjections.push("Missing core technical requirements listed in the JD.");
    if (hiringManagerObjections.length === 0) hiringManagerObjections.push("Looks solid. I'd definitely bring this candidate in for an interview.");

    const redFlags = [];
    if (totalWords > 800) redFlags.push({ issue: "Lengthy Resume", explanation: "I have extensive experience but can provide a 1-page executive summary if needed." });
    if (sectionsFound < 4) redFlags.push({ issue: "Missing Sections", explanation: "I prioritize a functional format focusing on direct impact over traditional structural sections." });
    if (redFlags.length === 0) redFlags.push({ issue: "Clean Profile", explanation: "No major red flags detected." });

    const missingSkillsGraph = keywordsMissing.map(skill => ({
      skill: skill,
      course_suggestion: `Free Codecamp: Advanced ${skill.charAt(0).toUpperCase() + skill.slice(1)}`,
      time_to_close: "2 weeks"
    }));

    let companyAnalysis = null;
    if (company_name && typeof company_name === 'string' && company_name.trim() !== '') {
      const apiKey = Deno.env.get("SEARCHAPI_API_KEY");
      let searchData = "";
      let searchQuery = company_name.trim();
      if (company_location && typeof company_location === 'string' && company_location.trim() !== '') {
        searchQuery += ` ${company_location.trim()}`;
      }

      if (apiKey) {
        searchData = await fetchCompanyInfo(searchQuery, apiKey);
      }

      if (!searchData) {
        searchData = `At ${company_name}, we build web apps and leverage tools. We look for candidates with ${techSkills.slice(0, 6).join(", ")} and ${softSkills.slice(0, 3).join(", ")}. Requirements: 3+ years experience.`;
      }

      const compProfile = extractCompanyProfile(searchData, techSkills, softSkills, company_name.trim());
      const userExp = estimateUserExperience(cv_text);

      const shortcomings: string[] = [];
      const compRecommendations: string[] = [];

      if (userExp < compProfile.required_experience) {
        shortcomings.push(`Experience Gap: This company typically requires around ${compProfile.required_experience}+ years of experience, but your CV indicates approximately ${userExp} year(s).`);
        compRecommendations.push(`Address the experience gap by highlighting direct project ownership or complex achievements.`);
      } else {
        compRecommendations.push(`Your experience level (${userExp} years) meets the company's expected requirements of ${compProfile.required_experience}+ years.`);
      }

      const missingCompSkills = compProfile.detected_tech_stack.filter(skill => !keywordsFound.has(skill));
      if (missingCompSkills.length > 0) {
        missingCompSkills.slice(0, 4).forEach(skill => {
          shortcomings.push(`Skill Gap: The company works with '${skill}', which is missing on your CV.`);
          compRecommendations.push(`Incorporate '${skill}' into your skills section or mention a project where you used it.`);
        });
      }

      if (shortcomings.length === 0) {
        shortcomings.push("No major gaps detected! Your CV aligns well with the company's tech stack and experience levels.");
      }

      companyAnalysis = {
        name: compProfile.name,
        detected_tech_stack: compProfile.detected_tech_stack,
        required_experience: `${compProfile.required_experience}+ years`,
        shortcomings: shortcomings,
        recommendations: compRecommendations
      };
    }

    const resultPayload = {
      success: true,
      ats_score: score,
      keywords_found: Array.from(keywordsFound),
      keywords_missing: keywordsMissing,
      suggestions: suggestions,
      overall_feedback: overall_feedback,
      hiring_manager_objections: hiringManagerObjections,
      red_flags: redFlags,
      skill_graph: missingSkillsGraph,
      company_analysis: companyAnalysis
    };

    // Save to scores table
    console.log("Saving score to database...");
    const { error: dbError } = await supabase.from("scores").insert({
      cv_id: cv_id,
      user_id: user.id,
      job_description: job_description || "",
      score: score
    });

    if (dbError) {
      console.error("Database insert error in scores:", dbError);
    }

    return jsonResponse(resultPayload);

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return jsonResponse({ success: false, error: err.message || "Internal server error" }, 500);
  }
});
