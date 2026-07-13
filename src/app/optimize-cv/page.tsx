"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, FileText, Loader2, ArrowLeft, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { exportPDF } from "@/lib/cv-formatter";
import { useCvStore } from "@/store/useCvStore";
import { pageTransition } from "@/lib/animations";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function OptimizeCvPage() {
  const router = useRouter();
  const { activeCvId, activeCvFilename, activeCvText, setPanelOpen } = useCvStore();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form states
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  // Results states
  const [optimizedText, setOptimizedText] = useState("");
  const [optimizedCvId, setOptimizedCvId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const handleOptimize = async () => {
    if (!activeCvId) return;
    if (jobDescription.trim().length < 50) {
      setStatusText("Job description is too short (min. 50 characters).");
      return;
    }

    setLoading(true);
    setStatusText("Tailoring resume sections...");
    setOptimizedText("");
    setOptimizedCvId(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in.");

      const res = await fetch(`${supabaseUrl}/functions/v1/optimize-cv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          cv_id: activeCvId,
          job_description: jobDescription
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOptimizedText(data.optimized_cv_text);
        setOptimizedCvId(data.optimized_cv_id);
        setSuggestions(data.changes_made || []);
        setStatusText("Optimized successfully!");
      } else {
        setStatusText(data.error || "Failed to optimize CV.");
      }
    } catch (err: any) {
      console.error(err);
      setStatusText(err.message || "Failed to query optimization server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    await exportPDF("Optimized_CV.pdf", optimizedText || activeCvText || "", setStatusText);
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
      <div className="flex-grow flex flex-col min-h-0">
        {!activeCvId ? (
          /* Empty State Guard Prompt */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 bg-white rounded-2xl max-w-md mx-auto my-12 w-full">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-[#6366F1]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-outfit text-base font-bold text-[#171717] mt-4">Active Resume Required</h3>
            <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-2 leading-relaxed">
              You need to select or upload an active CV before optimizing. Click the button below to open your resume library.
            </p>
            <Button
              onClick={() => setPanelOpen(true)}
              className="mt-6 h-[40px] bg-[#6366F1] hover:bg-[#4F46E5] text-white px-5 rounded-xl text-xs font-bold"
            >
              Open CV Library
            </Button>
          </div>
        ) : (
          /* Main Optimization Panel */
          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            {/* Input Details */}
            <div className="space-y-5">
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Optimizer Settings</span>
                
                <div className="flex items-center gap-2.5 bg-[#FAFAFA] border border-slate-200 px-3 py-2.5 rounded-xl">
                  <FileText className="w-4 h-4 text-[#6366F1] shrink-0" />
                  <p className="text-xs font-semibold truncate text-slate-700">{activeCvFilename}</p>
                </div>

                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Target Job Description</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description here to optimize CV bullet points (minimum 50 characters)..."
                    className="w-full h-44 bg-[#FAFAFA] border border-slate-200 rounded-lg p-3.5 text-xs text-[#171717] focus:outline-none focus:border-[#6366F1] resize-none leading-relaxed font-light"
                  />
                  {jobDescription.trim().length > 0 && jobDescription.trim().length < 50 && (
                    <p className="text-[10px] text-red-500 mt-2 font-medium">Needs at least 50 characters (current: {jobDescription.trim().length})</p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleOptimize}
                disabled={loading || jobDescription.trim().length < 50}
                className="w-full h-[44px] bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Optimize CV</span>
                  </>
                )}
              </Button>
              {statusText && <p className="text-xs text-indigo-600 font-semibold text-center mt-2">{statusText}</p>}
            </div>

            {/* Suggestions & Export Column */}
            <div>
              {loading ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-16 bg-slate-200 rounded"></div>
                  <div className="h-16 bg-slate-200 rounded"></div>
                </div>
              ) : optimizedCvId ? (
                <div className="space-y-5">
                  {/* Applied Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-3xs">
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Applied Suggestions</span>
                      <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                        {suggestions.map((s, idx) => (
                          <div key={idx} className="bg-[#FAFAFA] p-3 rounded-xl border border-slate-200 text-[11px] leading-relaxed">
                            <span className="bg-indigo-50 border border-indigo-100 text-[#6366F1] font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">{s.category || "General"}</span>
                            <p className="text-[#6B7280] mt-1.5"><span className="text-red-500 font-bold">Issue:</span> {s.issue}</p>
                            <p className="text-slate-700 mt-0.5"><span className="text-emerald-600 font-bold">Fix:</span> {s.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Options */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs text-center space-y-3.5 border-emerald-500/25 bg-emerald-500/[0.01]">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="font-outfit text-sm font-bold text-[#171717]">Optimized CV Generated</h4>
                    <p className="text-[11px] text-[#6B7280] max-w-xs mx-auto">
                      Your resume has been rephrased and tailored to include target keywords. You can now download the optimized PDF.
                    </p>
                    <div className="flex gap-2 justify-center pt-2">
                      <a
                        href={`/preview/${optimizedCvId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center"
                      >
                        Preview
                      </a>
                      <button
                        onClick={handleDownload}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center min-h-[220px] flex flex-col justify-center items-center shadow-3xs">
                  <Sparkles className="w-10 h-10 text-slate-350 mb-3" />
                  <h4 className="font-outfit text-sm font-bold text-[#171717]">Awaiting Optimization</h4>
                  <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-2 leading-relaxed font-light">
                    Enter the job requirements constraints on the left and submit to tailor your resume bullet points.
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
