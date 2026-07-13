"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, BarChart2, Sparkles, Briefcase, Home, CheckCircle2, AlertCircle } from "lucide-react";
import { useCvStore } from "@/store/useCvStore";

export default function SlideInPanel() {
  const router = useRouter();
  const {
    activeCvId,
    activeCvFilename,
    cvList,
    isPanelOpen,
    loading,
    setPanelOpen,
    setActiveCvId,
    deselectActiveCv,
    fetchCvs
  } = useCvStore();

  // Load CV library on mount and when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      fetchCvs();
    }
  }, [isPanelOpen, fetchCvs]);

  const handleNavigate = (path: string) => {
    setPanelOpen(false);
    router.push(path);
  };

  const handleDeselect = (e: React.MouseEvent) => {
    e.stopPropagation();
    deselectActiveCv();
  };

  const handleSelectCv = (id: string) => {
    setActiveCvId(id);
  };

  // Filter out the active CV to get "Previous CVs"
  const previousCvs = cvList.filter(c => c.id !== activeCvId);

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPanelOpen(false)}
            className="fixed inset-0 bg-[#171717]/40 backdrop-blur-xs cursor-pointer"
          />

          {/* Slide-In Panel container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: { type: "tween", duration: 0.25, ease: "easeOut" } }}
            exit={{ x: "100%", transition: { type: "tween", duration: 0.2, ease: "easeIn" } }}
            className="w-full max-w-sm bg-[#FAFAFA] border-l border-slate-200/80 shadow-2xl relative z-10 h-full flex flex-col p-6 text-[#171717] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 mb-6">
              <h2 className="font-outfit text-base font-bold text-[#171717] uppercase tracking-wider">
                CV Library Hub
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-[#6B7280] hover:text-[#171717] p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close Panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-6 min-h-0">
              
              {/* 1. "Current CV" Card */}
              <div>
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-2.5 ml-0.5">Active Resume</span>
                {activeCvId ? (
                  <div className="bg-white border border-[#6366F1]/30 p-4 rounded-xl flex items-center justify-between shadow-xs relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6366F1]"></div>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#6366F1] shrink-0" />
                      <p className="text-xs font-semibold text-[#171717] truncate">{activeCvFilename}</p>
                    </div>
                    <button
                      onClick={handleDeselect}
                      className="text-[#6B7280] hover:text-red-500 p-1 hover:bg-slate-50 rounded transition-colors"
                      title="Deselect Resume"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-250 p-4 rounded-xl text-center bg-white/50">
                    <AlertCircle className="w-4 h-4 text-[#6B7280] mx-auto mb-1.5" />
                    <p className="text-[11px] text-[#6B7280]">No active CV selected.</p>
                  </div>
                )}
              </div>

              {/* 2. "Previous CVs" List */}
              <div className="flex-1 flex flex-col min-h-0">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-2.5 ml-0.5">Previous CVs</span>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[120px] max-h-[45vh]">
                  {loading ? (
                    <div className="space-y-2 py-1">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-10 bg-white border border-slate-200/50 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : previousCvs.length === 0 ? (
                    <p className="text-xs text-[#6B7280] italic text-center py-6 bg-white/20 border border-dashed border-slate-200 rounded-xl">
                      No previous CVs
                    </p>
                  ) : (
                    previousCvs.map((cv) => (
                      <div
                        key={cv.id}
                        onClick={() => handleSelectCv(cv.id)}
                        className="bg-white border border-slate-200 p-3.5 rounded-xl cursor-pointer hover:border-[#6366F1]/55 transition-all flex items-center justify-between group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#6366F1]" />
                          <p className="text-xs font-medium text-slate-700 group-hover:text-[#171717] truncate">{cv.filename}</p>
                        </div>
                        <span className="text-[9px] text-[#6366F1] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Action Buttons & Navigation Directory */}
              <div className="pt-4 border-t border-slate-200/50 space-y-2">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5 ml-0.5">Actions</span>
                
                <button
                  onClick={() => handleNavigate("/ats-score")}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#6366F1]/40 text-xs font-semibold text-slate-700 hover:text-[#171717] shadow-3xs transition-all active:scale-98"
                >
                  <BarChart2 className="w-4 h-4 text-[#6366F1]" />
                  <span>Check ATS Score</span>
                </button>

                <button
                  onClick={() => handleNavigate("/optimize-cv")}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#6366F1]/40 text-xs font-semibold text-slate-700 hover:text-[#171717] shadow-3xs transition-all active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-[#6366F1]" />
                  <span>Optimize CV</span>
                </button>

                <button
                  onClick={() => handleNavigate("/job-search")}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#6366F1]/40 text-xs font-semibold text-slate-700 hover:text-[#171717] shadow-3xs transition-all active:scale-98"
                >
                  <Briefcase className="w-4 h-4 text-[#6366F1]" />
                  <span>Find Jobs</span>
                </button>

                <button
                  onClick={() => handleNavigate("/")}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-transparent bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-650 hover:text-[#171717] transition-all active:scale-98"
                >
                  <Home className="w-4 h-4 text-[#6B7280]" />
                  <span>Back to Home</span>
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
