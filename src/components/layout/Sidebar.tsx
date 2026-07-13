"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Sparkles, 
  BarChart2, 
  Briefcase, 
  Plus, 
  ArrowLeft,
  Trash2,
  Check,
  FileText,
  Zap,
  Loader2,
  Pencil
} from "lucide-react";
import { useCv } from "@/lib/CvContext";

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "Recent";
  }
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    cvList,
    activeCvId,
    loading,
    uploading,
    uploadProgress,
    setActiveCv,
    uploadCv,
    deleteCv,
    renameCv
  } = useCv();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setLocalError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setLocalError("Only .pdf and .docx CV files are supported.");
      return;
    }

    const res = await uploadCv(file);
    if (!res.success) {
      setLocalError(res.error || "Failed to upload CV.");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      setDeletingId(id);
      const success = await deleteCv(id);
      setDeletingId(null);
      if (!success) {
        setLocalError("Failed to delete CV.");
      }
    }
  };

  const handleRename = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const newName = prompt("Rename resume file name:", name);
    if (newName && newName.trim() !== "" && newName !== name) {
      const success = await renameCv(id, newName.trim());
      if (!success) {
        setLocalError("Failed to rename CV.");
      }
    }
  };

  // Check if we are inside a specific feature page
  const isFeaturePage =
    pathname.startsWith("/optimize-cv") ||
    pathname.startsWith("/ats-score") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/cv-builder");

  const menuItems = [
    { name: "Dashboard Hub", href: "/dashboard", icon: LayoutDashboard },
    { name: "Optimize CV", href: "/optimize-cv", icon: Sparkles, color: "text-orange-550 dark:text-orange-400" },
    { name: "Check ATS Score", href: "/ats-score", icon: BarChart2, color: "text-blue-550 dark:text-blue-400" },
    { name: "Job Matches", href: "/jobs", icon: Briefcase, color: "text-emerald-550 dark:text-emerald-400" },
    { name: "CV Builder", href: "/cv-builder", icon: FileText, color: "text-amber-550 dark:text-amber-400" }
  ];

  return (
    <>
      {/* Mobile Toggle Drawer Bar */}
      <div className="md:hidden flex items-center justify-between bg-white/90 dark:bg-slate-900/90 border-b border-slate-150 dark:border-slate-800 px-4 py-3 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-650 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
            {isFeaturePage 
              ? `Active: ${cvList.find(c => c.id === activeCvId)?.filename || "None selected"}`
              : "CareerForge Tools"
            }
          </span>
        </div>
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="text-xs font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/20 px-3 py-1.5 rounded-lg hover:bg-indigo-100/50 transition-all active:scale-95"
        >
          {isOpenMobile ? "Close Menu" : isFeaturePage ? "Open CV Library" : "Open Menu"}
        </button>
      </div>

      {/* Sidebar Panel Container */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-50/50 dark:bg-slate-950/40 backdrop-blur-md border-r border-slate-150 dark:border-slate-900 p-6 flex flex-col transition-transform duration-300 ease-out md:translate-x-0 md:static md:h-[calc(100vh-4rem)]
          ${isOpenMobile ? "translate-x-0 pt-20" : "-translate-x-full"}
        `}
      >
        {/* Dynamic Mode Content */}
        {!isFeaturePage ? (
          /* Launcher Dashboard Directory Mode */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-6">
              <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Menu Directory
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">Access AI career tool modules.</p>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpenMobile(false)}
                    className={`
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all border text-sm font-medium group
                      ${isActive
                        ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm"
                        : "border-transparent text-slate-550 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-900/30"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
                    <span className={isActive ? item.color || "text-indigo-600 dark:text-indigo-400" : ""}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : (
          /* Tool Library Feature Mode */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Back Button */}
            <Link
              href="/dashboard"
              onClick={() => setIsOpenMobile(false)}
              className="flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all py-2 px-3 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 hover:border-slate-300 rounded-xl mb-6 font-semibold group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="mb-4">
              <h2 className="font-outfit text-xs font-bold text-slate-855 dark:text-slate-300 uppercase tracking-wider">
                CV Library
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Configure your active resume.</p>
            </div>

            {/* Upload Action */}
            <div className="mb-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx"
                className="hidden"
              />
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin h-3.5 w-3.5" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Resume</span>
                  </>
                )}
              </button>
              
              {uploading && (
                <div className="mt-2.5 p-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl text-center">
                  <p className="text-[9px] font-semibold text-indigo-650 dark:text-indigo-400 uppercase tracking-wide">Extracting parsing...</p>
                  <p className="text-[10px] text-slate-450 truncate mt-0.5">{uploadProgress}</p>
                </div>
              )}

              {localError && (
                <p className="text-[10px] text-red-500 mt-2 bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 p-2 rounded-lg">{localError}</p>
              )}
            </div>

            {/* Resume Library List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850">
              {loading ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : cvList.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl p-3 bg-white/20">
                  <span className="text-xl block mb-1 opacity-50">📁</span>
                  <p className="text-[10px] text-slate-450">No resumes found. Click upload.</p>
                </div>
              ) : (
                cvList.map((cv) => {
                  const isActive = cv.id === activeCvId;
                  const isDeleting = cv.id === deletingId;
                  return (
                    <div
                      key={cv.id}
                      onClick={() => !uploading && !isDeleting && setActiveCv(cv.id)}
                      className={`
                        group p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between hover:bg-white dark:hover:bg-slate-900 relative overflow-hidden
                        ${isActive 
                          ? "border-indigo-600/70 bg-indigo-500/[0.03] dark:border-indigo-500/50" 
                          : "border-slate-200/50 dark:border-slate-850 bg-white/10 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-slate-800"
                        }
                        ${uploading || isDeleting ? "opacity-50 pointer-events-none" : ""}
                      `}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-600"></div>
                      )}

                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors w-full">
                          {cv.filename}
                        </p>
                        
                        <div className="flex gap-1 shrink-0">
                          {/* Rename resume button */}
                          <button
                            onClick={(e) => handleRename(e, cv.id, cv.filename)}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-450 hover:text-indigo-650 dark:hover:text-indigo-455 transition-opacity p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            title="Rename Resume"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Delete resume button */}
                          <button
                            onClick={(e) => handleDelete(e, cv.id, cv.filename)}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-455 hover:text-red-500 dark:hover:text-red-400 transition-opacity p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            title="Delete Resume"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2">
                        <span>{formatDate(cv.uploaded_at)}</span>
                        {isActive ? (
                          <span className="text-indigo-650 dark:text-indigo-400 font-bold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Active
                          </span>
                        ) : (
                          <span className="font-mono text-slate-450 uppercase">
                            {cv.filename.split('.').pop()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Switch Jump Menu */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-900 mt-4 shrink-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                <Zap className="w-3 h-3 text-indigo-500" />
                <span>Jump To Tool</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {menuItems.filter(item => item.href !== "/dashboard").map(item => {
                  const isCurrent = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpenMobile(false)}
                      className={`
                        text-[10px] font-semibold p-2 rounded-lg border text-center transition-all truncate flex items-center justify-center gap-1
                        ${isCurrent
                          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                          : "border-transparent text-slate-450 bg-white/40 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-white"
                        }
                      `}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{item.name.replace("Check ", "").replace("Job ", "")}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Backdrop for mobile drawer */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-30 bg-slate-950/65 md:hidden backdrop-blur-sm"
        />
      )}
    </>
  );
}
