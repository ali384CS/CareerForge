"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function JobsPage() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [marketPulse, setMarketPulse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchStatus, setSearchStatus] = useState("Initializing search...");
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetchJobs = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
          return;
        }
        setUser(session.user);
        setCheckingAuth(false);

        const cvText = localStorage.getItem("cv_for_jobs");
        if (!cvText) {
          setError("We need your CV to find matching jobs. Please analyze your CV on the Dashboard first.");
          setLoading(false);
          return;
        }

        setSearchStatus("Searching for matching jobs...");

        // Call our native Next.js server route which uses JSearch securely
        const res = await fetch(`/api/jobs`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cv_text: cvText })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch jobs.");
        }
        
        const fetchedJobs = data.jobs || [];
        setJobs(fetchedJobs);
        if (data.market_pulse) {
          setMarketPulse(data.market_pulse);
        }
        
        if (fetchedJobs.length === 0) {
          setSearchStatus("No matching jobs found at this time.");
        } else {
          setSearchStatus(`Found ${fetchedJobs.length} matching jobs!`);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch jobs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        router.push("/auth");
      }
      setCheckingAuth(false);
    });

    checkAuthAndFetchJobs();

    return () => subscription.unsubscribe();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-slate-400 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      <div className="mb-12">
        <h1 className="font-outfit text-4xl font-bold text-white mb-2">Job Matches</h1>
        <p className="text-slate-400 text-lg">Curated opportunities specifically tailored to your optimized CV.</p>
      </div>

      {loading && (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-slate-400 text-sm animate-pulse">{searchStatus}</p>
        </div>
      )}

      {error && !loading && (
        <div className="glass-card p-8 text-center max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-red-400 mb-4">Cannot Find Jobs</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2 rounded-xl transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-400">No matching jobs found at this time. Try refining your CV.</p>
        </div>
      )}

      {!loading && !error && marketPulse && (
        <div className="glass-card p-6 mb-8 border border-orange-500/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📈</span>
            <h2 className="font-outfit text-xl font-bold text-white">Real-time Market Pulse</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Insight</p>
              <p className="text-sm text-emerald-400 font-medium">{marketPulse.insight}</p>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Salary Trend</p>
              <p className="text-sm text-white font-medium">{marketPulse.salary_trend}</p>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Top Competitor Keywords</p>
              <div className="flex gap-2 mt-1">
                {marketPulse.competitor_keywords?.map((kw: string) => (
                  <span key={kw} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">{kw}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {jobs.map((job, idx) => (
            <div key={idx} className="break-inside-avoid glass-card p-6 hover:bg-slate-900 transition-colors group cursor-pointer border border-slate-800 hover:border-orange-500/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-outfit text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                  {job.title || job.job_title || 'Software Engineer'}
                </h3>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-2 py-1 rounded-lg border border-orange-500/20">
                    {job.match_score ? `${job.match_score}% Match` : 'New'}
                  </span>
                  {job.posted_hours_ago && (
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Posted {job.posted_hours_ago}h ago
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-300">{job.company || job.company_name || 'Tech Corp'}</p>
                <p className="text-xs text-slate-500">{job.location || 'Remote'}</p>
              </div>
              
              <div className="bg-slate-950/50 rounded-lg p-3 mb-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1"><span className="text-orange-400 font-bold">Auto-Fit Analysis:</span> You are missing <span className="text-white font-semibold">B2B SaaS</span> experience.</p>
                <p className="text-xs text-slate-500 italic">"Reframe your B2C Growth project to focus on user retention metrics, which translates well to SaaS."</p>
              </div>
              
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                {job.snippet || job.description?.substring(0, 150) || 'An exciting opportunity to work with cutting-edge technologies.'}...
              </p>
              
              <a 
                href={job.url || job.link || job.job_url || '#'} 
                target="_blank" 
                rel="noreferrer"
                className="inline-block text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Apply Now →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
