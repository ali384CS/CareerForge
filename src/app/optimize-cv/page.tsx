"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { exportPDF } from "@/lib/cv-formatter";
import { useCv } from "@/lib/CvContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function OptimizeCvPage() {
  const router = useRouter();
  const { activeCvId, activeCvFilename, activeCvText, loading: cvLoading } = useCv();
  
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // State
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  
  // Results State
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
      
      // Call optimize-cv Edge Function
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl pb-24 md:pb-8">
      <div className="mb-10 text-center">
        <h1 className="font-outfit text-4xl font-bold text-white mb-2">Optimize CV</h1>
        <p className="text-slate-400">Tailor your resume formatting and content to a target job description.</p>
      </div>

      <div className="space-y-8">
        
        {/* Card 1: Selected Active CV */}
        <div className="glass-card p-6 border border-slate-800">
          <h2 className="font-outfit text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-orange-500">1.</span> Active CV
          </h2>
          
          {activeCvId ? (
            <div className="flex items-center justify-between bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-orange-400 text-xs font-bold">
                    {activeCvFilename?.split('.').pop()?.toUpperCase() || "CV"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{activeCvFilename}</p>
                  <p className="text-xs text-slate-500">Ready for optimization</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl p-4">
              <span className="text-2xl block mb-2">📁</span>
              <p className="text-sm text-slate-400 mb-1">No active CV found.</p>
              <p className="text-xs text-slate-500">Please upload or select a CV from the CV Library sidebar to begin.</p>
            </div>
          )}
          {statusText && <p className="text-xs text-orange-400 mt-3">{statusText}</p>}
        </div>

        {/* Card 2: Job Description */}
        <div className="glass-card p-6 border border-slate-800">
          <h2 className="font-outfit text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-orange-500">2.</span> Job Description (required)
          </h2>
          <textarea 
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the target job description here for tailored optimization (minimum 50 characters)..."
            className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 text-sm resize-none"
          ></textarea>
          {jobDescription.trim().length > 0 && jobDescription.trim().length < 50 && (
            <p className="text-xs text-red-400 mt-2 font-medium animate-pulse">
              Job description must be at least 50 characters (current: {jobDescription.trim().length}/50)
            </p>
          )}
        </div>

        {/* Optimize Action Button */}
        <div className="md:mt-6">
          <button 
            onClick={handleAnalyze}
            disabled={loading || !activeCvId || jobDescription.trim().length < 50}
            className="w-full bg-white hover:bg-slate-200 text-slate-950 font-bold py-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.99]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full"></span>
                Optimizing CV...
              </span>
            ) : "Optimize CV"}
          </button>
        </div>

      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="mt-8 space-y-6">
          <div className="glass-card p-6 space-y-4 animate-pulse border border-slate-850">
            <div className="h-6 bg-slate-900 rounded w-1/4"></div>
            <div className="h-4 bg-slate-900 rounded w-3/4"></div>
            <div className="space-y-2 pt-4">
              <div className="h-4 bg-slate-900 rounded"></div>
              <div className="h-4 bg-slate-900 rounded"></div>
              <div className="h-4 bg-slate-900 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Suggestions & Download Section */}
      {optimizedCvId && !loading && (
        <div className="mt-8 space-y-8 animate-in fade-in duration-300">
          
          {/* Optimization Suggestions */}
          {suggestions.length > 0 && (
            <div className="glass-card p-6 border border-slate-800">
              <h3 className="font-outfit text-xl font-bold text-white mb-4">💡 AI Suggestions Applied</h3>
              <div className="space-y-4">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                    <div className="flex justify-between items-center gap-2 mb-1.5">
                      <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {s.category || "General"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400"><span className="text-red-400 font-semibold">Issue:</span> {s.issue}</p>
                    <p className="text-xs text-slate-200 mt-1"><span className="text-emerald-400 font-semibold">Recommendation:</span> {s.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Preview Trigger */}
          <div className="text-center glass-card p-8 border border-emerald-500/20">
            <h2 className="font-outfit text-2xl font-bold text-white mb-2">Optimized CV is Ready! 🎉</h2>
            <p className="text-slate-400 mb-6">Your resume has been tailored to the job description. Open the preview to view, modify, or download it.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href={`/preview/${optimizedCvId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
              >
                Open Preview
              </a>
              <button
                onClick={downloadPDF}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
