"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCv } from "@/lib/CvContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function AtsScorePage() {
  const router = useRouter();
  const { activeCvId, activeCvFilename, loading: cvLoading } = useCv();

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form States
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [domain, setDomain] = useState("general");
  const [roleType, setRoleType] = useState("job");
  const [companyName, setCompanyName] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [companyAnalysis, setCompanyAnalysis] = useState<any>(null);

  // Scorer results state
  const [score, setScore] = useState<number | null>(null);
  const [keywordsFound, setKeywordsFound] = useState<string[]>([]);
  const [keywordsMissing, setKeywordsMissing] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [hiringManagerObjections, setHiringManagerObjections] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<any[]>([]);
  const [skillGraph, setSkillGraph] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
        } else {
          setUser(session.user);
        }
      } catch {
        router.push("/auth");
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleClear = () => {
    setJobDescription("");
    setDomain("general");
    setRoleType("job");
    setCompanyName("");
    setCompanyLocation("");
    setCompanyAnalysis(null);
    setScore(null);
    setKeywordsFound([]);
    setKeywordsMissing([]);
    setFeedback("");
    setHiringManagerObjections([]);
    setRedFlags([]);
    setSkillGraph([]);
    setStatusText("");
  };

  const handleCalculateScore = async () => {
    if (!activeCvId) {
      setStatusText("Please select or upload a CV first.");
      return;
    }
    setLoading(true);
    setStatusText("Calculating ATS score...");
    setScore(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatusText("Session expired. Please log in.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/ats-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          cv_id: activeCvId,
          job_description: jobDescription || null,
          domain: domain,
          role_type: roleType,
          company_name: companyName || null,
          company_location: companyLocation || null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScore(data.ats_score);
        setKeywordsFound(data.keywords_found || []);
        setKeywordsMissing(data.keywords_missing || []);
        setFeedback(data.overall_feedback || "");
        setCompanyAnalysis(data.company_analysis || null);
        setHiringManagerObjections(data.hiring_manager_objections || []);
        setRedFlags(data.red_flags || []);
        setSkillGraph(data.skill_graph || []);
        setStatusText("Score computed successfully.");
      } else {
        setStatusText(data.error || "Failed to calculate score.");
      }
    } catch (err: any) {
      console.error(err);
      setStatusText("Failed to query ATS scoring server.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || cvLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-slate-400">Loading CV data...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-10 text-center md:text-left">
        <h1 className="font-outfit text-4xl font-bold text-white mb-2">Check ATS Score</h1>
        <p className="text-slate-400">Score your active CV against target roles, domains, and job descriptions.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Form Side */}
        <div className="space-y-6">
          
          {/* Card 1: Active CV Selection */}
          <div className="glass-card p-6 border border-slate-800">
            <h2 className="font-outfit text-lg font-bold text-white mb-4">1. Active CV</h2>
            {activeCvId ? (
              <div className="flex items-center justify-between bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-blue-400 text-xs font-bold">
                      {activeCvFilename?.split('.').pop()?.toUpperCase() || "CV"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{activeCvFilename}</p>
                    <p className="text-xs text-slate-500">Selected for scoring</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-850 rounded-xl p-4">
                <p className="text-sm text-slate-400 mb-1">No active CV found.</p>
                <p className="text-xs text-slate-500">Please upload or select a CV from the CV Library sidebar to start.</p>
              </div>
            )}
            {statusText && <p className="text-xs text-blue-400 mt-3">{statusText}</p>}
          </div>

          {/* Card 2: Domain & Target Role */}
          <div className="glass-card p-6 border border-slate-800">
            <h2 className="font-outfit text-lg font-bold text-white mb-2">2. Domain & Target Role</h2>
            <p className="text-xs text-slate-500 mb-4">Select the career path and experience level to tailor the ATS matching</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-850 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 text-sm cursor-pointer"
                >
                  <option value="general">General / Other</option>
                  <option value="web">Web Development</option>
                  <option value="ml">Machine Learning / AI</option>
                  <option value="data_engineering">Data Engineering</option>
                  <option value="devops">DevOps & Cloud</option>
                  <option value="cybersecurity">Cyber Security</option>
                  <option value="ui_ux">UI/UX Design</option>
                  <option value="pm">Product Management</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Role Type</label>
                <div className="grid grid-cols-2 gap-2 h-[46px]">
                  <button
                    type="button"
                    onClick={() => setRoleType("job")}
                    className={`rounded-xl text-xs font-bold transition-all ${roleType === "job" ? 'bg-blue-600 text-white' : 'bg-slate-950/50 text-slate-400 border border-slate-850 hover:bg-slate-900'}`}
                  >
                    Job
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleType("intern")}
                    className={`rounded-xl text-xs font-bold transition-all ${roleType === "intern" ? 'bg-blue-600 text-white' : 'bg-slate-950/50 text-slate-400 border border-slate-850 hover:bg-slate-900'}`}
                  >
                    Internship
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Target Company */}
          <div className="glass-card p-6 border border-slate-800">
            <h2 className="font-outfit text-lg font-bold text-white mb-2">3. Target Company (optional)</h2>
            <p className="text-xs text-slate-500 mb-4">Specify the company details to analyze alignment and search for their profiles precisely.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Google, Systems Ltd"
                  className="w-full bg-slate-950/50 border border-slate-850 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location (optional)</label>
                <input
                  type="text"
                  value={companyLocation}
                  onChange={(e) => setCompanyLocation(e.target.value)}
                  placeholder="e.g., Lahore, Remote"
                  className="w-full bg-slate-950/50 border border-slate-850 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Job Description */}
          <div className="glass-card p-6 border border-slate-800">
            <h2 className="font-outfit text-lg font-bold text-white mb-2">4. Job Description (optional)</h2>
            <p className="text-xs text-slate-500 mb-4">Add job description for role-specific scoring (optional)</p>
            <textarea 
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description here..."
              className="w-full h-36 bg-slate-950/50 border border-slate-850 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 text-sm resize-none"
            ></textarea>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleCalculateScore}
              disabled={loading || !activeCvId}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Calculating..." : "Check ATS Score"}
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-4 bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold rounded-xl border border-slate-800 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Side */}
        <div className="space-y-6">
          {score !== null ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Score card */}
              <div className="glass-card p-6 border border-slate-800">
                <h2 className="font-outfit text-lg font-bold text-white mb-6 text-center md:text-left">ATS Compatibility</h2>
                
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className={`relative h-32 w-32 rounded-full border-4 flex items-center justify-center ${score >= 75 ? 'border-emerald-500 bg-emerald-500/5' : score >= 40 ? 'border-amber-500 bg-amber-500/5' : 'border-red-500 bg-red-500/5'}`}>
                    <span className={`text-4xl font-outfit font-extrabold ${score >= 75 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                      {score}%
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Match Rating</span>
                </div>

                <div className="space-y-4 mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scoring Feedback</h4>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-850 italic">
                    "{feedback}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keywords Found</h4>
                    {keywordsFound.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {keywordsFound.map(k => <span key={k} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">{k}</span>)}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">None detected.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keywords Missing</h4>
                    {keywordsMissing.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {keywordsMissing.map(k => <span key={k} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">{k}</span>)}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 font-medium text-emerald-500">All matching!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Analysis Card */}
              {companyAnalysis && (
                <div className="glass-card p-6 border border-slate-800 animate-in slide-in-from-bottom duration-300">
                  <h2 className="font-outfit text-lg font-bold text-white mb-4">🏢 Target Company: {companyAnalysis.name}</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Expected Experience</span>
                        <p className="text-sm text-slate-200 font-medium">{companyAnalysis.required_experience || "3+ years"}</p>
                      </div>
                      {companyAnalysis.detected_tech_stack && companyAnalysis.detected_tech_stack.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Primary Tech Stack</span>
                          <div className="flex flex-wrap gap-1">
                            {companyAnalysis.detected_tech_stack.slice(0, 5).map((tech: string) => (
                              <span key={tech} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-900">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-2">Shortcomings / Gaps</span>
                      <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-300">
                        {companyAnalysis.shortcomings?.map((item: string, i: number) => (
                          <li key={i} className="leading-relaxed">{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-900">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">Actionable Recommendations</span>
                      <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-300">
                        {companyAnalysis.recommendations?.map((item: string, i: number) => (
                          <li key={i} className="leading-relaxed">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Hiring Manager simulator */}
              {hiringManagerObjections.length > 0 && (
                <div className="glass-card p-6 border border-slate-800">
                  <h3 className="font-outfit text-md font-bold text-white mb-3">💬 Hiring Manager objections</h3>
                  <ul className="space-y-2">
                    {hiringManagerObjections.map((obj, i) => (
                      <li key={i} className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                        "{obj}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gap red flags */}
              {redFlags.length > 0 && (
                <div className="glass-card p-6 border border-slate-800">
                  <h3 className="font-outfit text-md font-bold text-white mb-3">🚩 Red Flag explainer</h3>
                  <div className="space-y-2">
                    {redFlags.map((flag, i) => (
                      <div key={i} className="text-xs p-3 bg-slate-900/60 rounded-lg border border-slate-850">
                        <p className="font-semibold text-orange-400 mb-1">{flag.issue}</p>
                        <p className="text-slate-300 italic">"How to explain: {flag.explanation}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Graph recommendations */}
              {skillGraph.length > 0 && (
                <div className="glass-card p-6 border border-slate-800">
                  <h3 className="font-outfit text-md font-bold text-white mb-3">📚 Recommended Free Upskilling</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {skillGraph.map((item, i) => (
                      <div key={i} className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{item.skill.toUpperCase()}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{item.course_suggestion}</p>
                        </div>
                        <span className="text-[9px] text-orange-400/80 font-medium mt-2">⏱️ Close time: {item.time_to_close}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="glass-card p-12 text-center border border-slate-800 min-h-[300px] flex flex-col justify-center items-center">
              <span className="text-4xl mb-4">📊</span>
              <h3 className="font-outfit text-lg font-bold text-white mb-2">Ready to Score</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">Click "Check ATS Score" on the left to run advanced matching calculations using the active CV.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
