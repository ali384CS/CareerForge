"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  BarChart2, 
  Briefcase, 
  FileText, 
  Zap, 
  Loader2, 
  ArrowRight,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCv } from "@/lib/CvContext";
import { pageTransition, listContainer, listItem, hoverScale } from "@/lib/animations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

export default function DashboardHub() {
  const { cvList, activeCvId, activeCvFilename, loading: cvLoading } = useCv();
  
  const [user, setUser] = useState<any>(null);
  const [recentScores, setRecentScores] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        setUser(session.user);
        
        // Fetch recent score assessments and saved jobs in parallel
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
        setDbLoading(false);
      }
    };
    
    checkAuthAndFetchData();
  }, [activeCvId]);

  if (cvLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const latestAtsScore = recentScores.length > 0 ? Math.round(Number(recentScores[0].score)) : null;

  const features = [
    {
      title: "CV Optimizer",
      desc: "Tailor and optimize your resume content to a specific job description to beat ATS keyword filters.",
      icon: Sparkles,
      href: "/optimize-cv",
      accent: "hover:border-orange-500/50 hover:shadow-orange-500/5 dark:hover:shadow-none",
      iconColor: "text-orange-500 bg-orange-50 dark:bg-orange-950/20",
      btnStyle: "text-orange-600 hover:text-orange-700 dark:text-orange-400"
    },
    {
      title: "Check ATS Score",
      desc: "Analyze resume structures, keyword densities, formatting red flags, and get free upsell courses.",
      icon: BarChart2,
      href: "/ats-score",
      accent: "hover:border-blue-500/50 hover:shadow-blue-500/5 dark:hover:shadow-none",
      iconColor: "text-blue-550 bg-blue-50 dark:bg-blue-950/20",
      btnStyle: "text-blue-600 hover:text-blue-700 dark:text-blue-400"
    },
    {
      title: "Job Matches",
      desc: "Scan remote and local developer jobs matching your CV's technical profile using Jaccard keyword match scores.",
      icon: Briefcase,
      href: "/jobs", // maps to the search page
      accent: "hover:border-emerald-500/50 hover:shadow-emerald-500/5 dark:hover:shadow-none",
      iconColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20",
      btnStyle: "text-emerald-650 hover:text-emerald-700 dark:text-emerald-400"
    },
    {
      title: "CV Builder",
      desc: "Build an ATS-optimized, beautifully structured resume from scratch using a guide form and download it as PDF.",
      icon: FileText,
      href: "/cv-builder",
      accent: "hover:border-amber-500/50 hover:shadow-amber-500/5 dark:hover:shadow-none",
      iconColor: "text-amber-550 bg-amber-50 dark:bg-amber-950/20",
      btnStyle: "text-amber-600 hover:text-amber-700 dark:text-amber-400"
    }
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className="flex-grow p-6 md:p-8 max-w-5xl mx-auto w-full"
    >
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-8 mb-8 shadow-sm">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Dashboard Hub</p>
          <h1 className="font-outfit text-3xl font-bold text-slate-900 dark:text-white">Forge Your Career Journey</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm max-w-xl font-light leading-relaxed">
            Configure your active resume in the sidebar library, then launch one of our AI modules below to inspect, rephrase, or match developer opportunities.
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-5 rounded-2xl shadow-xs flex flex-col justify-between h-24">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Active Resume</span>
          {activeCvFilename ? (
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {activeCvFilename}
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">None selected</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-5 rounded-2xl shadow-xs flex flex-col justify-between h-24">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Resumes Count</span>
          <p className="text-xl font-extrabold font-outfit text-slate-800 dark:text-white flex items-baseline gap-1.5">
            {cvList.length}
            <span className="text-[10px] font-semibold text-slate-450 uppercase tracking-wider">stored</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-5 rounded-2xl shadow-xs flex flex-col justify-between h-24">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Latest ATS Score</span>
          {latestAtsScore !== null ? (
            <p className="text-xl font-extrabold font-outfit flex items-baseline gap-1.5
              ${latestAtsScore >= 80 ? 'text-emerald-500' : latestAtsScore >= 50 ? 'text-amber-500' : 'text-red-500'}"
            >
              {latestAtsScore}%
              <span className="text-[10px] font-semibold text-slate-450 uppercase tracking-wider">match rating</span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Awaiting check</p>
          )}
        </div>
      </div>

      {/* Feature grid launcher */}
      <div className="mb-6">
        <h2 className="font-outfit text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          AI Tool Launchpad
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {features.map((feat) => {
          const Icon = feat.icon;
          return (
            <Link
              key={feat.href}
              href={feat.href === "/jobs" ? "/job-search" : feat.href}
              className={`
                group relative block bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md
                ${feat.accent}
              `}
            >
              <div className="flex gap-4">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${feat.iconColor}`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {feat.title}
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">{feat.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Memory logs (bottom list logs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-150 dark:border-slate-900 pt-10">
        
        {/* ATS Scores History */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 ml-0.5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>Recent ATS Assessments</span>
          </div>

          {dbLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : recentScores.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl p-6 text-center text-xs text-slate-450 italic bg-white/10">
              No score records found.
            </div>
          ) : (
            <div className="space-y-3">
              {recentScores.map((score, i) => (
                <div key={score.id || i} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4 shadow-xs">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-355 font-medium truncate max-w-[240px]">
                      {score.job_description ? score.job_description.slice(0, 52) + "..." : "General compatibility check"}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(score.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-base font-bold font-outfit shrink-0 ${score.score >= 80 ? 'text-emerald-500' : score.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {Math.round(score.score)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved tracked jobs */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 ml-0.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            <span>Tracked Opportunities</span>
          </div>

          {dbLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : savedJobs.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl p-6 text-center text-xs text-slate-450 italic bg-white/10">
              No saved matches tracked yet.
            </div>
          ) : (
            <div className="space-y-3">
              {savedJobs.map((job, i) => (
                <div key={job.id || i} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4 shadow-xs">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{job.job_title}</p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 truncate mt-0.5">{job.company || "Tech Company"}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {job.match_score && (
                      <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-650 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-450 px-2 py-0.5 rounded-lg font-bold">
                        {job.match_score}%
                      </span>
                    )}
                    {job.job_url && (
                      <a
                        href={job.job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-650 hover:text-indigo-755 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold underline underline-offset-2"
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
    </motion.div>
  );
}
