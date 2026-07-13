"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hammer, Loader2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCvStore } from "@/store/useCvStore";
import Button from "@/components/ui/Button";

export default function Home() {
  const router = useRouter();
  const { uploadCv, fetchCvs, uploading, uploadProgress } = useCvStore();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        fetchCvs().then(() => setCheckingAuth(false));
      }
    });
  }, [router, fetchCvs]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setError("Only .pdf and .docx CV files are supported.");
      return;
    }

    const res = await uploadCv(file);
    if (!res.success) {
      setError(res.error || "Failed to upload and parse CV.");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#171717] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      
      {/* Hidden input for files */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx"
        className="hidden"
      />

      <div className="w-full max-w-lg space-y-12">
        {/* 1. About Us Section */}
        <section className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#6366F1] shadow-sm mb-2">
            <Hammer className="w-6 h-6" />
          </div>
          <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-[#171717]">
            CareerForge
          </h1>
          <p className="text-[#6B7280] text-sm leading-relaxed max-w-md mx-auto">
            CareerForge is an AI-powered resume enhancement platform that analyzes developer profiles. Upload your CV to check compatibility ratings, discover missing keyword gaps, optimize bullets, and match remote job listings.
          </p>
        </section>

        {/* 2. Centered Upload Button */}
        <section className="flex flex-col items-center space-y-4">
          <Button
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full max-w-xs h-[48px] bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 text-sm relative"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Your CV</span>
              </>
            )}
          </Button>

          {uploading && (
            <p className="text-xs text-[#6B7280] animate-pulse transition-all">
              {uploadProgress}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200/50 px-3 py-2 rounded-lg text-center max-w-xs">
              {error}
            </p>
          )}
        </section>
      </div>

    </main>
  );
}
