"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, 
  BookOpen, 
  AlertTriangle, 
  MessageSquare, 
  HelpCircle, 
  Building,
  RefreshCw,
  Loader2,
  CheckCircle,
  FileCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCv } from "@/lib/CvContext";
import { pageTransition, listContainer, listItem } from "@/lib/animations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function AtsScorePage() {
  const { activeCvId, activeCvFilename, loading: cvLoading } = useCv();

  // Form states
  const [jobDescription, setJobDescription] = useState("");
  const [domain, setDomain] = useState("general");
  const [roleType, setRoleType] = useState("job");
  const [companyName, setCompanyName] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  
  // Scorer results state
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [keywordsFound, setKeywordsFound] = useState<string[]>([]);
  const [keywordsMissing, setKeywordsMissing] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [companyAnalysis, setCompanyAnalysis] = useState<any>(null);
  const [hiringManagerObjections, setHiringManagerObjections] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<any[]>([]);
  const [skillGraph, setSkillGraph] = useState<any[]>([]);

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
    setStatusText("Calculating compatibility index...");
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
          "Authorization": `Bearer ${session.access_token}`
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

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className="flex-grow p-6 md:p-8 max-w-5xl mx-auto w-full"
    >
      {/* Title */}
      <div className="mb-8">
        <h1 className="font-outfit text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <span>📊</span> Check ATS Score
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {activeCvFilename ? (
            <>
              Check active CV against target metrics:{" "}
              <span className="text-indigo-650 dark:text-indigo-400 font-semibold">{activeCvFilename}</span>
            </>
          ) : (
            "Select an active CV from the sidebar to check compatibility."
          )}
        </p>
      </div>

      {!activeCvId ? (
        <Card hoverEffect={false} className="p-12 text-center border-dashed border-2">
          <FileCheck className="w-12 h-12 text-slate-350 mx-auto mb-4" />
          <h3 className="font-outfit text-lg font-bold text-slate-800 dark:text-slate-200">Active CV Required</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mt-2">
            Please upload or select an active CV in the CV Library sidebar to start calculating ATS scores.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Form Side */}
          <div className="space-y-6">
            {/* Card 1: Domain & Role Settings */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <span>1. Domain & Target Role</span>
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Domain</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-650 cursor-pointer"
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
                  <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">Role Type</label>
                  <div className="grid grid-cols-2 gap-2 h-[38px]">
                    <button
                      type="button"
                      onClick={() => setRoleType("job")}
                      className={`rounded-lg text-xs font-bold transition-all border
                        ${roleType === "job" 
                          ? 'bg-indigo-600 text-white border-transparent' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                    >
                      Job
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleType("intern")}
                      className={`rounded-lg text-xs font-bold transition-all border
                        ${roleType === "intern" 
                          ? 'bg-indigo-600 text-white border-transparent' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                    >
                      Internship
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Company details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-500" />
                <span>2. Target Company (optional)</span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Company Name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google"
                />
                <Input
                  label="Location"
                  type="text"
                  value={companyLocation}
                  onChange={(e) => setCompanyLocation(e.target.value)}
                  placeholder="e.g. Remote"
                />
              </div>
            </div>

            {/* Card 3: Job Description */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-500" />
                <span>3. Job Description (optional)</span>
              </h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description details here for matching TF-IDF check..."
                className="w-full h-36 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-600 resize-none"
              ></textarea>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleCalculateScore}
                disabled={loading}
                className="flex-1 rounded-xl h-[46px] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    <span>Calculate Score</span>
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={loading}
                className="rounded-xl px-5 h-[46px]"
              >
                Clear
              </Button>
            </div>
            {statusText && <p className="text-xs text-slate-450 dark:text-slate-400 mt-2 text-center">{statusText}</p>}
          </div>

          {/* Results Side */}
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-5 animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-850 rounded w-1/4"></div>
                <div className="h-32 w-32 rounded-full bg-slate-200 dark:bg-slate-850 mx-auto"></div>
                <div className="h-5 bg-slate-200 dark:bg-slate-850 rounded w-5/6"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-2/3"></div>
              </div>
            ) : score !== null ? (
              <motion.div
                initial="initial"
                animate="animate"
                variants={listContainer}
                className="space-y-6"
              >
                {/* Score Circle Card */}
                <motion.div variants={listItem} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm text-center">
                  <h3 className="font-outfit text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">ATS Compatibility Score</h3>
                  
                  <div className="flex flex-col items-center gap-4 mb-4">
                    <div className={`relative h-28 w-28 rounded-full border-4 flex items-center justify-center bg-slate-50 dark:bg-slate-950
                      ${score >= 80 
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                        : score >= 50 
                        ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
                        : 'border-red-500 text-red-650 dark:text-red-400'
                      }`}
                    >
                      <span className="text-3xl font-extrabold font-outfit">{score}%</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 italic max-w-sm mx-auto leading-relaxed border-t border-slate-100 dark:border-slate-850 pt-4 mt-4">
                    "{feedback}"
                  </p>
                </motion.div>

                {/* Keyword Analysis Card */}
                <motion.div variants={listItem} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Keyword Density Checks</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block mb-2">Matched ({keywordsFound.length})</span>
                      {keywordsFound.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {keywordsFound.map(k => (
                            <span key={k} className="text-[10px] bg-emerald-50 text-emerald-650 dark:bg-emerald-950/15 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10 px-2.5 py-0.5 rounded font-medium">
                              {k}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-450 italic">None found.</p>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block mb-2">Gaps / Missing ({keywordsMissing.length})</span>
                      {keywordsMissing.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {keywordsMissing.map(k => (
                            <span key={k} className="text-[10px] bg-red-50 text-red-650 dark:bg-red-950/15 dark:text-red-400 border border-red-100 dark:border-red-900/10 px-2.5 py-0.5 rounded font-medium">
                              {k}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">All keyword checks pass! ✓</p>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Simulated hiring manager comments */}
                {hiringManagerObjections.length > 0 && (
                  <motion.div variants={listItem} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-3">
                    <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      <span>Hiring Manager Obstacles</span>
                    </h3>
                    <div className="space-y-2">
                      {hiringManagerObjections.map((obj, i) => (
                        <p key={i} className="text-xs text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-3 rounded-xl italic">
                          "{obj}"
                        </p>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Red Flags Explainer */}
                {redFlags.length > 0 && (
                  <motion.div variants={listItem} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-3">
                    <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Resume Red Flags</span>
                    </h3>
                    <div className="space-y-2.5">
                      {redFlags.map((flag, i) => (
                        <div key={i} className="text-xs p-3.5 bg-slate-55 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-850">
                          <p className="font-bold text-amber-600 dark:text-amber-400 mb-1">{flag.issue}</p>
                          <p className="text-slate-500 dark:text-slate-450 italic mt-0.5">"Explainer: {flag.explanation}"</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Skill Graphups */}
                {skillGraph.length > 0 && (
                  <motion.div variants={listItem} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-3">
                    <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-500" />
                      <span>Recommended Skill Gaps Upskilling</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {skillGraph.map((item, i) => (
                        <div key={i} className="p-3 bg-slate-55 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-850 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.skill.toUpperCase()}</p>
                            <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1">{item.course_suggestion}</p>
                          </div>
                          <span className="text-[9px] text-indigo-650 dark:text-indigo-400 font-semibold mt-3.5">⏱️ Gaps close time: {item.time_to_close}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              </motion.div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-12 shadow-sm text-center min-h-[300px] flex flex-col justify-center items-center">
                <BarChart3 className="w-12 h-12 text-slate-350 mb-4" />
                <h3 className="font-outfit text-lg font-bold text-slate-800 dark:text-slate-200">Awaiting Calculations</h3>
                <p className="text-xs text-slate-450 max-w-xs mx-auto mt-2">
                  Paste a job description or select options, then click "Calculate Score" to run cosine checks.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
