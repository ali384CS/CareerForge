"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCVText, renderFormattedCV, exportPDF } from "@/lib/cv-formatter";

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [cvText, setCvText] = useState<string>("");
  const [originalText, setOriginalText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [status, setStatus] = useState("");

  const fetchCV = async () => {
    try {
      const { data, error } = await supabase
        .from("optimized_cvs")
        .select(`
          optimized_text,
          job_description,
          cvs (
            extracted_text
          )
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      if (data) {
        setCvText(data.optimized_text || "");
        setJobDescription(data.job_description || "");
        // @ts-ignore
        setOriginalText(data.cvs?.extracted_text || "");
      }
    } catch (err) {
      console.error("Error fetching CV:", err);
      setStatus("Error loading CV data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCV();
    }
  }, [id]);

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setRegenerating(true);
    setStatus("Regenerating CV...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jrglpmcfsptqsxjeeyuj.supabase.co";
      const res = await fetch(`${supabaseUrl}/functions/v1/optimize-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          cv_text: originalText || cvText,
          job_description: jobDescription,
          instruction: `Address this feedback from the user: ${feedback}`
        })
      });
      
      const optimizeData = await res.json();
      if (!res.ok || !optimizeData.success) {
        throw new Error(optimizeData.error || "Failed to optimize CV");
      }

      const newOptimizedText = optimizeData.optimized_cv_text;

      // Update the row in Supabase
      const { error: updateError } = await supabase
        .from("optimized_cvs")
        .update({
          optimized_text: newOptimizedText,
          suggestions: optimizeData.changes_made || []
        })
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchCV();
      setFeedback("");
      setStatus("CV updated successfully!");
    } catch (err: any) {
      console.error("Regeneration error:", err);
      setStatus(`Failed to regenerate: ${err.message || err}`);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    setStatus("Exporting PDF...");
    await exportPDF('Optimized_CV.pdf', cvText, setStatus);
  };

  const handleOpenPDF = async () => {
    setStatus("Generating PDF for preview...");
    try {
      const blob = await exportPDF('Optimized_CV.pdf', cvText, setStatus, true);
      if (blob) {
        const url = URL.createObjectURL(blob as Blob);
        window.open(url);
        setStatus("PDF opened in new tab.");
      } else {
        setStatus("Failed to generate PDF blob.");
      }
    } catch (e) {
      console.error(e);
      setStatus("Error opening PDF preview.");
    }
  };

  const handleDone = () => {
    try {
      window.close();
      // fallback in case window.close() is blocked by browser security rules
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (e) {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-slate-400">Loading CV preview...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-4 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-xl font-bold text-white flex items-center gap-2">
            <span>📄</span> CV Preview & Refinement
          </h1>
          {status && <p className="text-xs text-orange-400 mt-1">{status}</p>}
        </div>

        {/* Regenerate Form & Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleRegenerate} className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 w-full md:w-auto min-w-[280px]">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What would you like to change?"
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none flex-1 min-w-0 pr-2"
              disabled={regenerating}
            />
            <button
              type="submit"
              disabled={regenerating || !feedback.trim()}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
            >
              {regenerating ? "Applying..." : "Regenerate"}
            </button>
          </form>

          <button
            onClick={handleDownloadPDF}
            className="bg-slate-850 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
          >
            Download PDF
          </button>

          <button
            onClick={handleOpenPDF}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
          >
            Open PDF
          </button>

          <button
            onClick={handleDone}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Looks Good — Done
          </button>
        </div>
      </header>

      {/* Centered responsive A4 preview container */}
      <main className="flex-1 container mx-auto px-4 mt-8 max-w-4xl flex justify-center">
        <div className="bg-white text-slate-900 shadow-2xl rounded-2xl p-6 md:p-12 w-full font-serif overflow-x-hidden border border-slate-200">
          <div className="prose prose-slate max-w-none prose-sm md:prose-base font-serif scale-95 md:scale-100 origin-top">
            {renderFormattedCV(formatCVText(cvText) || cvText)}
          </div>
        </div>
      </main>
    </div>
  );
}
