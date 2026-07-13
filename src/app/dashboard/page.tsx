"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCv } from "@/lib/CvContext";

export default function DashboardHub() {
  const router = useRouter();
  const { cvList, activeCvId, activeCvFilename, loading: cvLoading } = useCv();
  
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Database State (Memory)
  const [recentScores, setRecentScores] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
          return;
        }
        setUser(session.user);
        
        // Parallel data loading
        const [scoresRes, jobsRes] = await Promise.all([
          supabase
            .from("scores")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("job_matches")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(3)
        ]);

        if (scoresRes.data) setRecentScores(scoresRes.data);
        if (jobsRes.data) setSavedJobs(jobsRes.data);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setCheckingAuth(false);
        setDbLoading(false);
      }
    };
    
    checkAuthAndFetchData();
  }, [router, activeCvId]);

  if (checkingAuth || cvLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-slate-400 text-sm">Forging dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Compute stats
  const latestAtsScore = recentScores.length > 0 ? Math.round(Number(recentScores[0].score)) : null;

  const features = [
    {
      title: "CV Optimizer",
      desc: "Tailor your resume content and rephrase bullet points using AI to match specific job descriptions.",
      icon: "✨",
      href: "/optimize-cv",
      accent: "from-orange-500/20 to-amber-500/10 border-orange-500/30 hover:border-orange-500/60",
      textColor: "text-orange-400"
    },
    {
      title: "Check ATS Score",
      desc: "Analyze resume structure, formatting red flags, keyword densities, and get free courses for gaps.",
      icon: "📊",
      href: "/ats-score",
      accent: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 hover:border-blue-500/60",
      textColor: "text-blue-400"
    },
    {
      title: "Job Matches",
      desc: "Find remote and local developer jobs matching your resume's technical skills using Jaccard indexes.",
      icon: "🔍",
      href: "/jobs",
      accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 hover:border-emerald-500/60",
      textColor: "text-emerald-400"
    },
    {
      title: "CV Builder",
      desc: "Draft a beautifully structured, ATS-compliant professional resume from scratch and export to PDF.",
      icon: "📝",
      href: "/cv-builder",
      accent: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 hover:border-amber-500/60",
      textColor: "text-amber-400"
    }
  ];

  return (
    <div className="container mx-auto px-6 py-10 max-w-5xl pb-24 md:pb-12">
      {/* Header and Welcome Card */}
      <div className="relative overflow-hidden glass-card p-8 border border-slate-800 mb-8 bg-gradient-to-br from-slate-900/60 to-slate-950/80">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1.5">Welcome to CareerForge</p>
          <h1 className="font-outfit text-3xl md:text-4xl font-bold text-white mb-2">
            Forge Your Career Path
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl font-light">
            You have authenticated as <span className="text-slate-200 font-semibold">{user.email}</span>. Use our pipeline of intelligent tools to format, optimize, and land interviews.
          </p>
        </div>
      </div>

      {/* Quick Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Stat 1: Active Resume */}
        <div className="glass-card p-5 border border-slate-850 bg-slate-900/20 flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Resume</p>
          {activeCvFilename ? (
            <div>
              <p className="text-sm font-semibold text-slate-100 truncate">{activeCvFilename}</p>
              <p className="text-[10px] text-orange-400 font-medium mt-0.5">Ready for optimization</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-400">None selected</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Upload a resume in a feature side menu</p>
            </div>
          )}
        </div>

        {/* Stat 2: Total Resumes */}
        <div className="glass-card p-5 border border-slate-850 bg-slate-900/20 flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CV Library Count</p>
          <div>
            <p className="text-2xl font-bold font-outfit text-white">{cvList.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Resumes uploaded in your profile</p>
          </div>
        </div>

        {/* Stat 3: Latest ATS Score */}
        <div className="glass-card p-5 border border-slate-850 bg-slate-900/20 flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latest ATS Score</p>
          <div>
            {latestAtsScore !== null ? (
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-outfit ${latestAtsScore >= 75 ? 'text-emerald-400' : latestAtsScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                  {latestAtsScore}%
                </span>
                <span className="text-[10px] text-slate-500">compatibility</span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-400">No score computed yet</p>
            )}
            <p className="text-[10px] text-slate-500 mt-0.5">Checked against target roles</p>
          </div>
        </div>
      </div>

      {/* Feature Launchpad Title */}
      <div className="mb-6">
        <h2 className="font-outfit text-xl font-bold text-white flex items-center gap-2">
          <span>🚀</span> Select an Application Feature
        </h2>
        <p className="text-xs text-slate-450 mt-0.5">Launch a specialized tool to refine your job search pipeline.</p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {features.map((feat) => (
          <Link
            key={feat.href}
            href={feat.href}
            className={`
              group relative block p-6 rounded-2xl border bg-gradient-to-br transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-slate-950/20 duration-200
              ${feat.accent}
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xl block mb-4 group-hover:scale-110 transition-transform duration-200">{feat.icon}</span>
                <h3 className="font-outfit text-lg font-bold text-white mb-2 flex items-center gap-2">
                  {feat.title} <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-normal">→</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">{feat.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Memory Layer: Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-900 pt-10">
        
        {/* Column 1: Recent ATS Scores */}
        <div>
          <h3 className="font-outfit text-md font-bold text-white mb-4 flex items-center gap-2">
            <span>📊</span> Recent ATS Assessments
          </h3>
          
          {dbLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-slate-900/40 border border-slate-900 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentScores.length === 0 ? (
            <div className="border border-dashed border-slate-900 rounded-xl p-6 text-center">
              <p className="text-xs text-slate-500 italic">No score histories recorded yet.</p>
              <Link href="/ats-score" className="text-xs text-blue-400 hover:text-blue-300 font-semibold mt-2 inline-block">
                Check ATS Score →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScores.map((score, i) => (
                <div key={score.id || i} className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-medium truncate max-w-[250px]">
                      {score.job_description ? score.job_description.slice(0, 50) + "..." : "General compatibility assessment"}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1">
                      {new Date(score.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-base font-bold font-outfit shrink-0 ${score.score >= 75 ? 'text-emerald-400' : score.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {Math.round(score.score)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Saved Matches */}
        <div>
          <h3 className="font-outfit text-md font-bold text-white mb-4 flex items-center gap-2">
            <span>💾</span> Tracked Job Matches
          </h3>
          
          {dbLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-slate-900/40 border border-slate-900 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : savedJobs.length === 0 ? (
            <div className="border border-dashed border-slate-900 rounded-xl p-6 text-center">
              <p className="text-xs text-slate-500 italic">No job matches saved yet.</p>
              <Link href="/jobs" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold mt-2 inline-block">
                Explore Job Matches →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {savedJobs.map((job, i) => (
                <div key={job.id || i} className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{job.job_title}</p>
                    <p className="text-[10px] text-slate-450 truncate mt-0.5">{job.company || "Tech Corp"}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {job.match_score && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        {job.match_score}%
                      </span>
                    )}
                    {job.job_url && (
                      <a
                        href={job.job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-slate-300 hover:text-white font-semibold underline underline-offset-2"
                      >
                        Apply
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
