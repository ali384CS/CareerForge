"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Briefcase, Globe, Filter, Star, Loader2, ArrowLeft, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCvStore } from "@/store/useCvStore";
import { pageTransition, listContainer, listItem } from "@/lib/animations";
import Button from "@/components/ui/Button";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function JobSearchPage() {
  const router = useRouter();
  const { activeCvId, activeCvFilename, setPanelOpen } = useCvStore();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // API states
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servedBy, setServedBy] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Form states
  const [searchQuery, setSearchQuery] = useState("");

  // Filters state
  const [roleFilter, setRoleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [remoteOnly, setRemoteOnly] = useState("all"); // "all", "remote", "onsite"
  const [minMatchScore, setMinMatchScore] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const fetchJobs = async (customQuery = "") => {
    if (!activeCvId) return;
    setLoading(true);
    setError(null);
    setJobs([]);
    setServedBy(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in.");

      const payload: any = { cv_id: activeCvId };
      if (customQuery.trim()) {
        payload.query = customQuery.trim();
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/job-search`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch job matches.");
      }
      
      setJobs(data.jobs || []);
      setServedBy(data.served_by || "API");
    } catch (err: any) {
      console.error("Job search error:", err);
      setError(err.message || "Failed to fetch jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch jobs on mount when active CV is available
  useEffect(() => {
    if (activeCvId && !checkingAuth) {
      fetchJobs(searchQuery);
    }
  }, [activeCvId, checkingAuth]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(searchQuery);
  };

  const handleSaveJob = async (job: any, index: number) => {
    if (!activeCvId) return;
    const saveKey = `${job.job_title}-${job.company}-${index}`;
    setSavingId(saveKey);
    try {
      const { error } = await supabase
        .from("job_matches")
        .insert({
          cv_id: activeCvId,
          job_title: job.job_title,
          company: job.company,
          job_url: job.job_url,
          match_score: job.match_score || 70, // Default to 70% if empty
          skill_gaps: job.skill_gaps || null
        });

      if (error) throw error;
      alert(`Tracked "${job.job_title}" successfully!`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to track job: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // Client-side filtering logic
  const filteredJobs = jobs.filter((job) => {
    const titleMatch = job.job_title.toLowerCase().includes(roleFilter.toLowerCase());
    const companyMatch = job.company.toLowerCase().includes(roleFilter.toLowerCase());
    const matchesRole = roleFilter === "" || titleMatch || companyMatch;

    const matchesLocation =
      locationFilter === "" ||
      job.location.toLowerCase().includes(locationFilter.toLowerCase());

    const isRemote = job.location.toLowerCase().includes("remote") || job.job_description?.toLowerCase().includes("remote");
    const matchesRemote =
      remoteOnly === "all" ||
      (remoteOnly === "remote" && isRemote) ||
      (remoteOnly === "onsite" && !isRemote);

    const score = job.match_score || 70;
    const matchesScore = score >= minMatchScore;

    return matchesRole && matchesLocation && matchesRemote && matchesScore;
  });

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
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-outfit text-base font-bold text-[#171717] mt-4">Active Resume Required</h3>
            <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-2 leading-relaxed">
              You need to select or upload an active CV before searching for matched opportunities. Click the button below to open your resume library.
            </p>
            <Button
              onClick={() => setPanelOpen(true)}
              className="mt-6 h-[40px] bg-[#6366F1] hover:bg-[#4F46E5] text-white px-5 rounded-xl text-xs font-bold"
            >
              Open CV Library
            </Button>
          </div>
        ) : (
          /* Search Interface */
          <div className="space-y-6">
            
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-3">
              <div className="relative flex-grow">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter custom keywords (e.g. React)... or leave empty to auto-extract CV skills"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all shadow-3xs"
                />
              </div>
              <Button type="submit" disabled={loading} className="shrink-0 rounded-xl px-5 h-[42px] bg-[#6366F1]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
            </form>

            {/* Filter controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-[#6366F1]" />
                  <span>Keyword Filter</span>
                </label>
                <input
                  type="text"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  placeholder="Title or Company"
                  className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-slate-200 rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#6366F1]" />
                  <span>Location</span>
                </label>
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="City or Country"
                  className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-slate-200 rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#6366F1]" />
                  <span>Workplace Settings</span>
                </label>
                <select
                  value={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-slate-200 rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#6366F1] cursor-pointer"
                >
                  <option value="all">All Workplace</option>
                  <option value="remote">Remote Only</option>
                  <option value="onsite">On-Site / Local</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#6366F1]" />
                  <span>Min Match ({minMatchScore}%)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minMatchScore}
                  onChange={(e) => setMinMatchScore(Number(e.target.value))}
                  className="w-full mt-2.5 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#6366F1]"
                />
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6 pt-2"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="border border-red-250 bg-red-50/50 p-4 rounded-2xl text-center text-xs text-red-650 font-medium">
                {error}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="border border-dashed border-slate-250 p-12 text-center rounded-2xl bg-white/40">
                <p className="text-xs text-[#6B7280]">No job postings found matching criteria.</p>
              </div>
            ) : (
              <motion.div
                variants={listContainer}
                initial="initial"
                animate="animate"
                className="space-y-4"
              >
                <AnimatePresence>
                  {filteredJobs.map((job, idx) => {
                    const score = job.match_score || 70;
                    const saveKey = `${job.job_title}-${job.company}-${idx}`;
                    
                    return (
                      <motion.div
                        key={saveKey}
                        variants={listItem}
                        layoutId={saveKey}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs hover:border-[#6366F1]/40 transition-colors flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <h3 className="font-outfit font-bold text-[#171717] text-sm truncate pr-1">
                              {job.job_title}
                            </h3>
                            <p className="text-xs font-semibold text-[#6B7280] mt-0.5 truncate">
                              {job.company || "Company"}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#6366F1] shrink-0" />
                              {job.location}
                            </p>
                          </div>
                          
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0
                            ${score >= 80 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                              : score >= 50
                              ? "bg-amber-50 border-amber-100 text-amber-600"
                              : "bg-red-50 border-red-100 text-red-650"
                            }
                          `}>
                            {score}% Match
                          </span>
                        </div>

                        {job.job_description && (
                          <p className="text-[11px] text-[#6B7280] mt-3 leading-relaxed line-clamp-2 font-light">
                            {job.job_description}
                          </p>
                        )}

                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                          <a
                            href={job.job_url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-[#6366F1] hover:text-[#4F46E5] transition-colors uppercase tracking-wider"
                          >
                            Apply Now →
                          </a>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={savingId !== null}
                            onClick={() => handleSaveJob(job, idx)}
                            className="rounded-xl border-slate-200 hover:bg-slate-50 text-[10px] h-[30px] px-2.5 flex items-center justify-center gap-1.5"
                          >
                            {savingId === saveKey ? (
                              <Loader2 className="w-3 h-3 animate-spin text-[#6B7280]" />
                            ) : (
                              <>
                                <span>💾</span>
                                <span>Track</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}

          </div>
        )}
      </div>

    </motion.div>
  );
}
