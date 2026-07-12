"use client";

import React, { useRef, useState } from "react";
import { useCv } from "@/lib/CvContext";

export default function CvSidebar() {
  const {
    cvList,
    activeCvId,
    loading,
    uploading,
    uploadProgress,
    setActiveCv,
    uploadCv
  } = useCv();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
    
    // Clear input so same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="md:hidden flex items-center justify-between bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Active CV: {cvList.find(c => c.id === activeCvId)?.filename || "None selected"}
          </span>
        </div>
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg hover:bg-orange-500/20 transition-all active:scale-95"
        >
          {isOpenMobile ? "Close Library" : "Open CV Library"}
        </button>
      </div>

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 md:w-72 bg-slate-950/70 backdrop-blur-md border-r border-slate-900 p-6 flex flex-col transition-transform duration-350 ease-out md:translate-x-0 md:static md:h-[calc(100vh-4rem)]
          ${isOpenMobile ? "translate-x-0 pt-20" : "-translate-x-full"}
        `}
      >
        <div className="mb-6">
          <h2 className="font-outfit text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>🗂️</span> CV Library
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage resumes and select the active CV for analysis.</p>
        </div>

        {/* Upload Trigger */}
        <div className="mb-6">
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
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
          >
            {uploading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <span className="text-lg font-light">+</span>
                <span>Upload New CV</span>
              </>
            )}
          </button>
          
          {uploading && (
            <div className="mt-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse">
              <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide">Progress</p>
              <p className="text-xs text-slate-300 mt-0.5">{uploadProgress}</p>
            </div>
          )}

          {localError && (
            <p className="text-xs text-red-400 mt-2 bg-red-500/10 border border-red-500/25 p-2 rounded-lg">{localError}</p>
          )}
        </div>

        {/* CV List Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-900/40 border border-slate-850 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : cvList.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-850 rounded-xl p-4">
              <span className="text-2xl block mb-2 opacity-60">📁</span>
              <p className="text-xs text-slate-400">No CVs uploaded yet. Click upload to begin.</p>
            </div>
          ) : (
            cvList.map((cv) => {
              const isActive = cv.id === activeCvId;
              return (
                <div
                  key={cv.id}
                  onClick={() => !uploading && setActiveCv(cv.id)}
                  className={`
                    group p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between hover:bg-slate-900/40 relative overflow-hidden
                    ${isActive 
                      ? "border-orange-500/70 bg-orange-500/[0.03] shadow-md shadow-orange-500/[0.02]" 
                      : "border-slate-850 bg-slate-900/10 hover:border-slate-700"
                    }
                    ${uploading ? "opacity-50 pointer-events-none" : ""}
                  `}
                >
                  {/* Glowing vertical marker for active status */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                  )}

                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-orange-400 transition-colors">
                      {cv.filename}
                    </p>
                    {isActive && (
                      <span className="text-emerald-400 text-xs font-bold shrink-0">✓ Active</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <span>{formatDate(cv.uploaded_at)}</span>
                    <span className="text-slate-600 font-mono">
                      {cv.filename.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
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
