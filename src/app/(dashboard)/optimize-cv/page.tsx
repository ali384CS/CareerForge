"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, Download, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { exportPDF } from "@/lib/cv-formatter";
import { useCv } from "@/lib/CvContext";
import { pageTransition, listContainer, listItem } from "@/lib/animations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function OptimizeCvPage() {
  const router = useRouter();
  const { activeCvId, activeCvFilename, activeCvText, loading: cvLoading } = useCv();
  
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Form states
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  
  // Results state
  const [optimizedText, setOptimizedText] = useState("");
  const [optimizedCvId, setOptimizedCvId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Restore cached results from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("dashboard_results");
      if (cached) {
        const data = JSON.parse(cached);
        if (data.jobDescription) setJobDescription(data.jobDescription);
        if (data.optimizedText) setOptimizedText(data.optimizedText);
        if (data.optimizedCvId) setOptimizedCvId(data.optimizedCvId);
        if (data.suggestions) setSuggestions(data.suggestions);
      }
    } catch {}
  }, []);

  // Persist results to sessionStorage whenever they change
  useEffect(() => {
    if (optimizedText || optimizedCvId) {
      try {
        sessionStorage.setItem("dashboard_results", JSON.stringify({
          jobDescription, optimizedText, optimizedCvId, suggestions
        }));
      } catch {}
    }
  }, [jobDescription, optimizedText, optimizedCvId, suggestions]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
        } else {
          setUser(session.user);
        }
      } catch {
        router.push("/login");
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleAnalyze = async () => {
    if (!activeCvId) {
      setStatusText("Please select or upload a CV first.");
      return;
    }
    if (jobDescription.trim().length < 50) {
      setStatusText("Job description is too short.");
      return;
    }

    setLoading(true);
    setStatusText("Optimizing CV formatting...");
    setOptimizedCvId(null);
    setOptimizedText("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatusText("Session expired. Please log in.");
        setLoading(false);
        return;
      }
      
      const optimizeRes = await fetch(`${supabaseUrl}/functions/v1/optimize-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          cv_id: activeCvId,
          job_description: jobDescription
        })
      });

      const optimizeData = await optimizeRes.json();

      if (optimizeRes.ok && optimizeData.success) {
        setOptimizedText(optimizeData.optimized_cv_text);
        setOptimizedCvId(optimizeData.optimized_cv_id);
        setSuggestions(optimizeData.changes_made || []);
        setStatusText("Optimized successfully!");
      } else {
        setStatusText(optimizeData.error || "Failed to optimize CV.");
      }
    } catch (err: any) {
      setStatusText("Error during analysis: " + (err.message || err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    await exportPDF('Optimized_CV.pdf', optimizedText || activeCvText || '', setStatusText);
  };

  if (checkingAuth || cvLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-650" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className="flex-grow p-6 md:p-8 max-w-3xl mx-auto w-full pb-24"
    >
      {/* Title */}
      <div className="mb-8">
        <h1 className="font-outfit text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <span>✨</span> Optimize CV
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Tailor your resume formatting and content to match a target job description.
        </p>
      </div>

      <div className="space-y-6">
        {/* Card 1: Selected Active CV */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-outfit text-sm font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="text-indigo-600 font-bold font-outfit">1.</span>
            <span>Active Resume Selection</span>
          </h2>
          
          {activeCvId ? (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/35 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-650 dark:text-indigo-400 text-xs font-bold font-mono">
                    {activeCvFilename?.split('.').pop()?.toUpperCase() || "CV"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{activeCvFilename}</p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500">Ready for AI tailoring</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl p-4 bg-slate-50/40">
              <span className="text-xl block mb-1">📁</span>
              <p className="text-xs text-slate-450 mb-1">No active CV found.</p>
              <p className="text-[10px] text-slate-500">Please upload or select a CV from the Library sidebar to begin.</p>
            </div>
          )}
          {statusText && <p className="text-xs text-indigo-650 dark:text-indigo-400 mt-2 text-center font-medium">{statusText}</p>}
        </div>

        {/* Card 2: Job Description */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-outfit text-sm font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="text-indigo-600 font-bold font-outfit">2.</span>
            <span>Target Job Description (required)</span>
          </h2>
          <textarea 
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the target job description here for tailored optimization (minimum 50 characters)..."
            className="w-full h-40 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-3.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-605 resize-none leading-relaxed"
          ></textarea>
          {jobDescription.trim().length > 0 && jobDescription.trim().length < 50 && (
            <p className="text-xs text-red-500 mt-2 font-medium animate-pulse">
              Job description must be at least 50 characters (current: {jobDescription.trim().length}/50)
            </p>
          )}
        </div>

        {/* Optimize Action Button */}
        <Button 
          onClick={handleAnalyze}
          disabled={loading || !activeCvId || jobDescription.trim().length < 50}
          className="w-full h-[46px] rounded-xl flex items-center justify-center gap-2 font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Optimizing...</span>
            </>
          ) : (
            <span>Optimize CV</span>
          )}
        </Button>

      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="mt-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 animate-pulse space-y-3">
            <div className="h-5 bg-slate-200 dark:bg-slate-850 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-5/6"></div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-4/5"></div>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Suggestions & Download Section */}
      {optimizedCvId && !loading && (
        <motion.div
          initial="initial"
          animate="animate"
          variants={listContainer}
          className="mt-8 space-y-6"
        >
          {/* Optimization Suggestions */}
          {suggestions.length > 0 && (
            <motion.div variants={listItem} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Applied AI Recommendations</h3>
              <div className="space-y-3">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-850">
                    <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-650 dark:bg-indigo-950/15 dark:text-indigo-400 dark:border-indigo-900/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      {s.category || "Recommendation"}
                    </span>
                    <p className="text-xs text-slate-500 mt-2"><span className="text-red-500 font-bold">Problem:</span> {s.issue}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1"><span className="text-emerald-500 font-bold">Fix:</span> {s.recommendation}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Download Preview Card */}
          <motion.div variants={listItem} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-8 text-center space-y-4 shadow-sm border-emerald-500/20 bg-emerald-500/[0.01]">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h2 className="font-outfit text-xl font-bold text-slate-900 dark:text-white">Optimized Resume Ready! 🎉</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
              Your resume has been tailored to the job description constraints. View, test, or download the optimized PDF.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <a 
                href={`/preview/${optimizedCvId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs"
              >
                Open Preview
              </a>
              <button
                onClick={downloadPDF}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
