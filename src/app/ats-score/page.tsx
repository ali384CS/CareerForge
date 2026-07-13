"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart2, FileText, Loader2, ArrowLeft, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCvStore } from "@/store/useCvStore";
import { pageTransition } from "@/lib/animations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function AtsScorePage() {
  const router = useRouter();
  const { activeCvId, activeCvFilename, setPanelOpen } = useCvStore();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Scorer parameters
  const [jobDescription, setJobDescription] = useState("");
  const [domain, setDomain] = useState("general");
  const [roleType, setRoleType] = useState("job");

  // Scoring response states
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [keywordsFound, setKeywordsFound] = useState<string[]>([]);
  const [keywordsMissing, setKeywordsMissing] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const handleCalculateScore = async () => {
    if (!activeCvId) return;
    setLoading(true);
    setStatusText("Analyzing CV compatibility...");
    setScore(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in.");

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
          role_type: roleType
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScore(data.ats_score);
        setKeywordsFound(data.keywords_found || []);
        setKeywordsMissing(data.keywords_missing || []);
        setFeedback(data.overall_feedback || "");
        setStatusText("");
      } else {
        setStatusText(data.error || "Failed to calculate ATS score.");
      }
    } catch (err: any) {
      console.error(err);
      setStatusText(err.message || "Failed to query ATS scoring server.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className="min-h-screen bg-[#FAFAFA] text-[#171717] p-6 md:p-12 max-w-4xl mx-auto w-full flex flex-col justify-between"
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between border-b border-slate-200/50 pb-4 mb-8">
        <button
          onClick={() => router.push("/")}
          className="text-xs font-semibold text-[#6B7280] hover:text-[#171717] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <button
          onClick={() => setPanelOpen(true)}
          className="text-xs font-bold text-[#6366F1] bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/50 px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <FileText className="w-4 h-4" />
          <span>{activeCvFilename ? "Change active CV" : "Open CV Library"}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {!activeCvId ? (
          /* Empty State Guard Prompt */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 bg-white rounded-2xl max-w-md mx-auto my-12 w-full">
            <AlertCircleIcon />
            <h3 className="font-outfit text-base font-bold text-[#171717] mt-4">Active Resume Required</h3>
            <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-2 leading-relaxed">
              You need to select or upload an active CV before running compatibility checks. Click the button below to open your resume library.
            </p>
            <Button
              onClick={() => setPanelOpen(true)}
              className="mt-6 h-[40px] bg-[#6366F1] hover:bg-[#4F46E5] text-white px-5 rounded-xl text-xs font-bold"
            >
              Open CV Library
            </Button>
          </div>
        ) : (
          /* Feature Body */
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Scorer Form Input */}
            <div className="space-y-5">
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Target Role Options</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Domain</label>
                    <select
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-slate-200 rounded-lg p-2.5 text-xs text-[#171717] focus:outline-none focus:border-[#6366F1] cursor-pointer font-medium"
                    >
                      <option value="general">General / Other</option>
                      <option value="web">Web Development</option>
                      <option value="ml">Machine Learning / AI</option>
                      <option value="data_engineering">Data Engineering</option>
                      <option value="devops">DevOps & Cloud</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Role Type</label>
                    <div className="grid grid-cols-2 gap-2 h-[38px]">
                      <button
                        type="button"
                        onClick={() => setRoleType("job")}
                        className={`rounded-lg text-xs font-bold transition-all border
                          ${roleType === "job" 
                            ? 'bg-[#6366F1] text-white border-transparent' 
                            : 'bg-[#FAFAFA] text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        Job
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoleType("intern")}
                        className={`rounded-lg text-xs font-bold transition-all border
                          ${roleType === "intern" 
                            ? 'bg-[#6366F1] text-white border-transparent' 
                            : 'bg-[#FAFAFA] text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        Intern
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Job Description (optional)</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target developer job description here to check similarity matching..."
                    className="w-full h-32 bg-[#FAFAFA] border border-slate-200 rounded-lg p-3 text-xs text-[#171717] focus:outline-none focus:border-[#6366F1] resize-none leading-relaxed font-light"
                  />
                </div>
              </div>

              <Button
                onClick={handleCalculateScore}
                disabled={loading}
                className="w-full h-[44px] bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <BarChart2 className="w-4 h-4" />
                    <span>Check ATS Score</span>
                  </>
                )}
              </Button>
              {statusText && <p className="text-xs text-red-500 font-medium text-center">{statusText}</p>}
            </div>

            {/* Scorer Report Display */}
            <div>
              {loading ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-20 w-20 rounded-full bg-slate-200 mx-auto"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6 pt-2"></div>
                </div>
              ) : score !== null ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-2xs">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-4">Match Score</span>
                    <div className={`inline-flex h-20 w-20 rounded-full border-4 items-center justify-center font-bold text-lg font-outfit bg-[#FAFAFA]
                      ${score >= 80 ? 'border-emerald-500 text-emerald-600' : score >= 50 ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-650'}`}
                    >
                      {score}%
                    </div>
                    {feedback && (
                      <p className="text-xs text-[#6B7280] italic leading-relaxed max-w-xs mx-auto mt-4 border-t border-slate-100 pt-3">
                        "{feedback}"
                      </p>
                    )}
                  </div>

                  {/* Missing Keywords list */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block border-t border-slate-100 pt-4">Keyword Analysis</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Found</span>
                        {keywordsFound.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {keywordsFound.map(k => (
                              <span key={k} className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded font-medium">
                                {k}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#6B7280] italic">None detected.</p>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Missing</span>
                        {keywordsMissing.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {keywordsMissing.map(k => (
                              <span key={k} className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded font-medium">
                                {k}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-emerald-600 font-semibold">All keys matched!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center min-h-[220px] flex flex-col justify-center items-center shadow-3xs">
                  <BarChart2 className="w-10 h-10 text-slate-300 mb-3" />
                  <h4 className="font-outfit text-sm font-bold text-[#171717]">Awaiting Assessment</h4>
                  <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-2 leading-relaxed font-light">
                    Submit parameters on the left to compute the active CV's ATS density matching index.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </motion.div>
  );
}

function AlertCircleIcon() {
  return (
    <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-[#6366F1]">
      <HelpCircle className="w-6 h-6" />
    </div>
  );
}
