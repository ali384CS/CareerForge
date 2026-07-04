from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import re
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="CareerForge ATS Scorer")

# Load spacy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # Fallback in case loading fails
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

TECH_SKILLS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "php", "go", "rust", "swift", "kotlin",
  "react", "angular", "vue", "next.js", "node.js", "express", "django", "flask", "spring", "laravel",
  "sql", "mysql", "postgresql", "mongodb", "redis", "firebase", "supabase", "docker", "kubernetes", "aws", "azure", "gcp",
  "html", "css", "sass", "tailwind", "git", "github", "gitlab", "ci/cd", "agile", "scrum", "machine learning", "ai",
  "data science", "data analysis", "pandas", "numpy", "tensorflow", "pytorch",
  "rest api", "graphql", "microservices", "linux", "bash", "powershell", "terraform", "ansible",
  "jenkins", "circleci", "webpack", "vite", "oauth", "jwt", "ssl", "api gateway",
  "figma", "sketch", "photoshop", "illustrator", "indesign", "ui/ux", "user experience", "graphic design",
  "seo", "sem", "google analytics", "salesforce", "hubspot", "excel", "quickbooks"
]

SOFT_SKILLS = [
  "leadership", "communication", "teamwork", "problem solving", "time management", "critical thinking",
  "adaptability", "collaboration", "project management", "organization", "negotiation", "public speaking",
  "conflict resolution", "attention to detail", "stakeholder management"
]

class ScoreRequest(BaseModel):
    cv_text: str
    job_description: Optional[str] = None

def score_general_health(cv_text: str) -> Dict:
    text_lower = cv_text.lower()
    words = re.findall(r'\b\w+\b', text_lower)
    total_words = len(words)

    # 1. Structure Score (max 20)
    expected_sections = ["summary", "experience", "education", "skills", "languages", "projects", "certifications", "awards"]
    sections_found = sum(1 for sec in expected_sections if sec in text_lower)
    structure_score = min(20, sections_found * 4)

    # 2. Action Verbs (max 20)
    action_verbs = ["managed", "developed", "led", "created", "designed", "implemented", "improved", "increased", "decreased",
                    "spearheaded", "orchestrated", "architected", "optimized", "streamlined", "resolved", "launched", "delivered",
                    "executed", "pioneered", "transformed", "automated", "coordinated", "mentored", "negotiated"]
    verbs_found = sum(1 for verb in action_verbs if verb in words)
    verbs_score = min(20, verbs_found * 3)

    # 3. Quantifiable Achievements (max 20)
    quantifiable_pattern = r'(\d+%\b|\$\d+[kKmM]?\b|\b\d+\+|\b\d+x\b)'
    metrics = re.findall(quantifiable_pattern, text_lower)
    quantifiable_score = min(20, len(metrics) * 5)

    # 4. Keyword Density (max 20)
    all_skills = TECH_SKILLS + SOFT_SKILLS
    skills_found = [skill for skill in all_skills if skill in text_lower]
    density = (len(skills_found) / total_words * 100) if total_words > 0 else 0
    density_score = 0
    if 1.2 <= density <= 6.0:
        density_score = 20
    elif density > 0.5:
        density_score = 10
    elif density > 0:
        density_score = 5

    # 5. Length Score (max 20)
    length_score = 0
    if 150 <= total_words <= 800:
        length_score = 20
    elif 100 <= total_words <= 1000:
        length_score = 10
    elif total_words >= 50:
        length_score = 5

    total_score = structure_score + verbs_score + quantifiable_score + density_score + length_score
    total_score = max(0, min(100, total_score))

    keywords_found_set = set(skills_found)
    missing_keywords = [skill for skill in all_skills if skill not in keywords_found_set][:5]

    feedback = []
    if total_score >= 80:
        feedback.append("Excellent CV structure and formatting. Highly compatible with modern ATS systems.")
    elif total_score >= 50:
        feedback.append("Good start, but your CV could benefit from adding more quantifiable metrics and strong action verbs.")
    else:
        feedback.append("Critical improvements needed. Condense length, add standard sections (Summary, Experience, Skills), and use metric-driven achievements.")

    if not metrics:
        feedback.append("Try to include quantifiable achievements (e.g., increased efficiency by 25%).")

    return {
        "ats_score": int(total_score),
        "keywords_found": list(keywords_found_set)[:10],
        "keywords_missing": missing_keywords,
        "overall_feedback": " ".join(feedback)
    }

def score_with_jd(cv_text: str, jd_text: str) -> Dict:
    cv_lower = cv_text.lower()
    jd_lower = jd_text.lower()

    # Extract required tech and soft skills
    jd_tech_required = {skill for skill in TECH_SKILLS if skill in jd_lower}
    jd_soft_required = {skill for skill in SOFT_SKILLS if skill in jd_lower}

    # Find matches in CV
    tech_matched = {skill for skill in jd_tech_required if skill in cv_lower}
    soft_matched = {skill for skill in jd_soft_required if skill in cv_lower}

    keywords_found = list(tech_matched) + list(soft_matched)
    keywords_missing = list(jd_tech_required - tech_matched) + list(jd_soft_required - soft_matched)

    # Compute TF-IDF Cosine Similarity
    vectorizer = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = vectorizer.fit_transform([cv_text, jd_text])
        cos_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    except Exception:
        cos_sim = 0.0

    # Weights: 55% tech skill overlap, 35% cosine similarity, 10% soft skills
    tech_ratio = (len(tech_matched) / len(jd_tech_required)) if jd_tech_required else 1.0
    soft_ratio = (len(soft_matched) / len(jd_soft_required)) if jd_soft_required else 1.0

    weighted_score = (tech_ratio * 55) + (cos_sim * 35) + (soft_ratio * 10)
    final_score = int(max(0, min(100, weighted_score)))

    # Hard cap for mismatched domains
    if jd_tech_required and len(tech_matched) == 0:
        final_score = min(final_score, 28)
    elif jd_tech_required and (len(tech_matched) / len(jd_tech_required)) < 0.15:
        final_score = min(final_score, 33)

    feedback = []
    if final_score >= 75:
        feedback.append("Excellent role alignment. Your CV shares strong keyword similarity and domain overlap with the job description.")
    elif final_score >= 45:
        missing_sample = ", ".join(keywords_missing[:3]) if keywords_missing else "skills"
        feedback.append(f"Moderate alignment. To improve your match score, weave the missing skills (e.g. {missing_sample}) directly into your experience section bullets.")
    else:
        feedback.append("Domain mismatch or major skill gaps detected. Ensure you tailor your CV's technical vocabulary to match this job description.")

    return {
        "ats_score": final_score,
        "keywords_found": keywords_found[:12],
        "keywords_missing": keywords_missing[:8],
        "overall_feedback": " ".join(feedback)
    }

@app.post("/score")
async def get_ats_score(request: ScoreRequest):
    if not request.cv_text or request.cv_text.strip() == "":
        raise HTTPException(status_code=400, detail="CV text cannot be empty")
    
    try:
        if not request.job_description or request.job_description.strip() == "":
            return score_general_health(request.cv_text)
        else:
            return score_with_jd(request.cv_text, request.job_description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"status": "running", "service": "CareerForge ATS Python Scorer"}
