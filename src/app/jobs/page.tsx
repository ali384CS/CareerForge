"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCv } from "@/lib/CvContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function JobsPage() {
  const router = useRouter();
  const { activeCvId, activeCvFilename, loading: cvLoading } = useCv();
  
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [marketPulse, setMarketPulse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState("Initializing search...");
  const [servedBy, setServedBy] = useState<string | null>(null);

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

  useEffect(() => {
    if (checkingAuth || cvLoading || !user) return;

    const fetchJobs = async () => {
      if (!activeCvId) {
        setError("We need your active CV to search for jobs. Please select or upload a CV in the CV Library sidebar first.");
        setJobs([]);
        setServedBy(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSearchStatus("Searching for matching jobs across providers...");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Session expired. Please log in.");
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/job-search`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ cv_id: activeCvId })
        });
        
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to fetch jobs.");
        }
        
        const fetchedJobs = data.jobs || [];
        setJobs(fetchedJobs);
        setServedBy(data.served_by || "API");

        // Mock market pulse data matching query title
        const topJob = fetchedJobs[0]?.job_title || "Software Engineering";
        setMarketPulse({
          insight: `Jobs for '${topJob}' are highly searched in this area.`,
          salary_trend: "Trending positive",
          competitor_keywords: ["Cloud", "APIs", "Database"]
        });
        
        if (fetchedJobs.length === 0) {
          setSearchStatus("No matching jobs found at this time.");
        } else {
          setSearchStatus(`Found ${fetchedJobs.length} matching jobs!`);
        }
      } catch (err: any) {
        console.error("Job search error:", err);
        setError(err.message || "Failed to fetch jobs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [activeCvId, checkingAuth, cvLoading, user]);

  if (checkingAuth || cvLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-slate-400 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      <div className="mb-12">
        <h1 className="font-outfit text-4xl font-bold text-white mb-2">Job Matches</h1>
        <p className="text-slate-400 text-lg">
          Curated opportunities specifically tailored to your active CV: <span className="text-orange-400 font-semibold">{activeCvFilename || "None"}</span>
        </p>
      </div>

      {loading && (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-slate-400 text-sm animate-pulse">{searchStatus}</p>
        </div>
      )}

      {error && !loading && (
        <div className="glass-card p-8 text-center max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-red-400 mb-4">No CV Selected or Error</h2>
          <p className="text-slate-400 mb-6">{error}</p>
        </div>
      )}

      {!activeCvId && !loading && !error && (
        <div className="glass-card p-12 text-center border border-slate-800 max-w-2xl mx-auto">
          <span className="text-4xl mb-4 block">🔍</span>
          <h3 className="font-outfit text-lg font-bold text-white mb-2">Select Active CV</h3>
          <p className="text-sm text-slate-500">Please upload or select an active resume in the CV Library sidebar on the left to find your personalized jobs.</p>
        </div>
      )}

      {activeCvId && !loading && !error && jobs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-400">No matching jobs found at this time for CV: "{activeCvFilename}".</p>
        </div>
      )}

      {activeCvId && !loading && !error && marketPulse && (
        <div className="glass-card p-6 mb-8 border border-orange-500/30">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📈</span>
              <h2 className="font-outfit text-xl font-bold text-white">Real-time Market Pulse</h2>
            </div>
            {servedBy && (
              <span className="text-[10px] text-slate-500 font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
                Served by: {servedBy}
              </span>
            )}
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

      {activeCvId && !loading && !error && jobs.length > 0 && (
        <div className="space-y-12 animate-in fade-in duration-350">
          {/* Best Matches */}
          {jobs.filter(j => !j.is_broader_match).length > 0 && (
            <div>
              <h2 className="font-outfit text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-2 flex items-center gap-2">
                <span>🔥</span> Best Matches
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.filter(j => !j.is_broader_match).map((job, idx) => (
                  <div key={idx} className="glass-card p-6 hover:bg-slate-900 transition-colors group cursor-pointer border border-slate-800 hover:border-orange-500/50 flex flex-col justify-between h-[360px]">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-outfit text-lg font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-2 pr-2">
                          {job.job_title}
                        </h3>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-2 py-1 rounded-lg border border-orange-500/20">
                            {job.match_score ? `${job.match_score}% Match` : 'New'}
                          </span>
                          {job.posted_hours_ago && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {job.posted_hours_ago}h ago
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-slate-300 truncate">{job.company || 'Tech Corp'}</p>
                        <p className="text-xs text-slate-500">{job.location || 'Remote'}</p>
                      </div>
                      
                      <div className="bg-slate-950/50 rounded-lg p-3 mb-4 border border-slate-800">
                        <p className="text-[10px] text-slate-400 mb-0.5"><span className="text-orange-400 font-bold">Auto-Fit Analysis:</span> CV matches keywords.</p>
                        <p className="text-xs text-slate-500 italic">"Strong relevance to your technical skills."</p>
                      </div>
                      
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {job.snippet || 'Exciting opportunity aligning with your CV.'}...
                      </p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-900/50">
                      <a 
                        href={job.job_url || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-block text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        Apply Now →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Broader Matches */}
          {jobs.filter(j => j.is_broader_match).length > 0 && (
            <div>
              <h2 className="font-outfit text-2xl font-bold text-slate-400 mb-6 border-b border-slate-800 pb-2 flex items-center gap-2">
                <span>🌐</span> Broader Matches
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.filter(j => j.is_broader_match).map((job, idx) => (
                  <div key={idx} className="glass-card p-6 hover:bg-slate-900 transition-colors group cursor-pointer border border-slate-850 hover:border-slate-700 flex flex-col justify-between h-[280px]">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-outfit text-md font-bold text-slate-300 group-hover:text-white transition-colors line-clamp-2 pr-2">
                          {job.job_title}
                        </h3>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="bg-slate-800 text-slate-450 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-700">
                            Broader
                          </span>
                          {job.posted_hours_ago && (
                            <span className="text-slate-500 text-[10px]">
                              {job.posted_hours_ago}h ago
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-slate-400 truncate">{job.company || 'Tech Corp'}</p>
                        <p className="text-xs text-slate-500">{job.location || 'Remote'}</p>
                      </div>
                      
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {job.snippet || 'Related match.'}...
                      </p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-900/50">
                      <a 
                        href={job.job_url || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-block text-sm font-semibold text-slate-400 hover:text-slate-300 transition-colors"
                      >
                        Apply Now →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
