"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCv } from "@/lib/CvContext";
import { supabase } from "@/lib/supabase";

export default function AppSidebar() {
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
    deleteCv
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

  const handleSignOut = async () => {
    router.push("/");
    try {
      localStorage.removeItem("cv_for_jobs");
      sessionStorage.removeItem("dashboard_results");
    } catch {}
    await supabase.auth.signOut();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });
    } catch {
      return "Recently";
    }
  };

  // Check if we are inside a specific feature page
  const isFeaturePage =
    pathname.startsWith("/optimize-cv") ||
    pathname.startsWith("/ats-score") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/cv-builder");

  const menuItems = [
    { name: "Dashboard Hub", href: "/dashboard", icon: "🏠" },
    { name: "Optimize CV", href: "/optimize-cv", icon: "✨", color: "text-orange-400" },
    { name: "Check ATS Score", href: "/ats-score", icon: "📊", color: "text-blue-400" },
    { name: "Job Matches", href: "/jobs", icon: "🔍", color: "text-emerald-400" },
    { name: "CV Builder", href: "/cv-builder", icon: "📝", color: "text-amber-400" }
  ];

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="md:hidden flex items-center justify-between bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-350 truncate max-w-[180px]">
            {isFeaturePage 
              ? `Active: ${cvList.find(c => c.id === activeCvId)?.filename || "None selected"}`
              : "CareerForge Tools"
            }
          </span>
        </div>
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg hover:bg-orange-500/20 transition-all"
        >
          {isOpenMobile ? "Close Menu" : isFeaturePage ? "Open CV Library" : "Open Menu"}
        </button>
      </div>

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 md:w-72 bg-slate-950/70 backdrop-blur-md border-r border-slate-900 p-6 flex flex-col transition-transform duration-300 ease-out md:translate-x-0 md:static md:h-[calc(100vh-4rem)]
          ${isOpenMobile ? "translate-x-0 pt-20" : "-translate-x-full"}
        `}
      >
        {/* Dynamic Mode: Hub vs Feature */}
        {!isFeaturePage ? (
          /* Hub Mode Sidebar: Show tool directory */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-8">
              <h2 className="font-outfit text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>🛠️</span> Core Features
              </h2>
              <p className="text-xs text-slate-400 mt-1">Select an AI tool to forge your resume.</p>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpenMobile(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all border font-medium text-sm group
                      ${isActive
                        ? "bg-slate-900 border-slate-800 text-white font-semibold"
                        : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50"
                      }
                    `}
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className={isActive ? item.color || "text-orange-400" : ""}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : (
          /* Feature Mode Sidebar: Show back button & CV Library */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Back to Dashboard launcher */}
            <Link
              href="/dashboard"
              onClick={() => setIsOpenMobile(false)}
              className="flex items-center justify-center gap-2 text-xs text-slate-450 hover:text-white transition-all py-2.5 px-3 bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-xl mb-6 font-semibold group hover:bg-slate-900"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
            </Link>

            <div className="mb-4">
              <h2 className="font-outfit text-md font-bold text-white tracking-wide flex items-center gap-2">
                <span>🗂️</span> CV Library
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Manage and select your active CV.</p>
            </div>

            {/* Upload Button */}
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
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                    <span className="text-xs">Uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base font-light">+</span>
                    <span>Upload CV</span>
                  </>
                )}
              </button>
              
              {uploading && (
                <div className="mt-2.5 p-2 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                  <p className="text-[9px] font-semibold text-orange-400 uppercase tracking-wide">Uploading file...</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{uploadProgress}</p>
                </div>
              )}

              {localError && (
                <p className="text-[11px] text-red-400 mt-2 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{localError}</p>
              )}
            </div>

            {/* Scrollable CV List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-855">
              {loading ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-900/40 border border-slate-855 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : cvList.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-855 rounded-xl p-3">
                  <span className="text-xl block mb-1.5 opacity-60">📁</span>
                  <p className="text-[11px] text-slate-400">No CVs found. Upload one to start.</p>
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
                        group p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between hover:bg-slate-900/40 relative overflow-hidden
                        ${isActive 
                          ? "border-orange-500/70 bg-orange-500/[0.02]" 
                          : "border-slate-855 bg-slate-900/10 hover:border-slate-800"
                        }
                        ${uploading || isDeleting ? "opacity-50 pointer-events-none" : ""}
                      `}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500"></div>
                      )}

                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-orange-400 transition-colors w-full">
                          {cv.filename}
                        </p>
                        
                        {/* Delete button, shown on hover */}
                        <button
                          onClick={(e) => handleDelete(e, cv.id, cv.filename)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-0.5 hover:bg-slate-800 rounded shrink-0"
                          title="Delete CV"
                        >
                          <svg xmlns="http://www.w3.org/2050/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2">
                        <span>{formatDate(cv.uploaded_at)}</span>
                        {isActive ? (
                          <span className="text-emerald-500 font-bold">Active</span>
                        ) : (
                          <span className="font-mono text-slate-600">
                            {cv.filename.split('.').pop()?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Switch Jump Menu */}
            <div className="pt-3 border-t border-slate-900 mt-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Tools Quick Jump</p>
              <div className="grid grid-cols-2 gap-1.5">
                {menuItems.filter(item => item.href !== "/dashboard").map(item => {
                  const isCurrent = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpenMobile(false)}
                      className={`
                        text-[10px] font-semibold p-2 rounded-lg border text-center transition-all truncate
                        ${isCurrent
                          ? "bg-slate-900 border-slate-800 text-white"
                          : "border-transparent text-slate-400 bg-slate-950 hover:bg-slate-900 hover:text-white"
                        }
                      `}
                    >
                      {item.icon} {item.name.replace("Check ", "").replace("Job ", "")}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Area: User Status & Log Out */}
        <div className="pt-4 border-t border-slate-900 mt-4 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={handleSignOut}
            className="hover:text-red-400 transition-colors font-medium flex items-center gap-1.5"
          >
            <span>🚪</span> Log Out
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-sm"
        />
      )}
    </>
  );
}
