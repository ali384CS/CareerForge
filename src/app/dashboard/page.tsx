"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import { formatCVText, renderFormattedCV, exportPDF } from "@/lib/cv-formatter";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// ============================================
// SESSION CACHE — prevents redundant auth checks on re-navigation
// ============================================
let cachedUser: any = null;

export default function Dashboard() {
  const [user, setUser] = useState<any>(cachedUser);
  const [checkingAuth, setCheckingAuth] = useState(!cachedUser);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State — restored from sessionStorage if available
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  
  // Results State
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [keywordsFound, setKeywordsFound] = useState<string[]>([]);
  const [keywordsMissing, setKeywordsMissing] = useState<string[]>([]);
  const [optimizedText, setOptimizedText] = useState("");
  const [optimizedCvId, setOptimizedCvId] = useState<string | null>(null);
  
  // Restore cached results from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("dashboard_results");
      if (cached) {
        const data = JSON.parse(cached);
        if (data.extractedText) setExtractedText(data.extractedText);
        if (data.jobDescription) setJobDescription(data.jobDescription);
        if (data.atsScore !== null && data.atsScore !== undefined) setAtsScore(data.atsScore);
        if (data.keywordsFound) setKeywordsFound(data.keywordsFound);
        if (data.keywordsMissing) setKeywordsMissing(data.keywordsMissing);
        if (data.optimizedText) setOptimizedText(data.optimizedText);
        if (data.optimizedCvId) setOptimizedCvId(data.optimizedCvId);
      }
    } catch {}
  }, []);

  // Persist results to sessionStorage whenever they change
  useEffect(() => {
    if (extractedText || optimizedText || atsScore !== null) {
      try {
        sessionStorage.setItem("dashboard_results", JSON.stringify({
          extractedText, jobDescription, atsScore, keywordsFound, keywordsMissing, optimizedText,
          optimizedCvId
        }));
      } catch {}
    }
  }, [extractedText, jobDescription, atsScore, keywordsFound, keywordsMissing, optimizedText, optimizedCvId]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
        } else {
          setUser(session.user);
          cachedUser = session.user;
        }
      } catch {
        router.push("/auth");
      } finally {
        setCheckingAuth(false);
      }
    };

    if (!cachedUser) {
      checkAuth();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        cachedUser = session.user;
      } else {
        setUser(null);
        cachedUser = null;
        router.push("/auth");
      }
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Handle File Upload and extraction
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setStatusText("Extracting text...");
    
    try {
      const text = await extractTextFromFile(selectedFile);
      setExtractedText(text);
      setStatusText("Text extracted successfully!");
    } catch (err) {
      setStatusText("Failed to extract text. Please try again.");
    }
  };

  // Clear uploaded file
  const handleClearFile = () => {
    setFile(null);
    setExtractedText("");
    setStatusText("");
    setAtsScore(null);
    setKeywordsFound([]);
    setKeywordsMissing([]);
    setOptimizedText("");
    setOptimizedCvId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    try { sessionStorage.removeItem("dashboard_results"); } catch {}
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.name.endsWith('.pdf')) {
        reader.onload = async function() {
          try {
            const typedarray = new Uint8Array(this.result as ArrayBuffer);
            // @ts-ignore
            const pdfjsLib = window['pdfjs-dist/build/pdf'];
            if (!pdfjsLib) {
              reject(new Error("PDF library is still loading. Please wait a moment and try again."));
              return;
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + "\n";
            }
            resolve(fullText);
          } catch (e) {
            reject(e);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.docx')) {
        reader.onload = function(event) {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          // @ts-ignore
          if (!window.mammoth) {
            reject(new Error("DOCX library is still loading. Please wait a moment and try again."));
            return;
          }
          // @ts-ignore
          window.mammoth.extractRawText({ arrayBuffer: arrayBuffer })
            .then(function(result: any) {
              resolve(result.value);
            }).catch(reject);
        };
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error("Unsupported file format. Please use .pdf or .docx files."));
      }
    });
  };

  const handleAnalyze = async () => {
    if (!extractedText) return;
    setLoading(true);
    setStatusText("Analyzing CV...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatusText("Session expired. Please log in.");
        setLoading(false);
        return;
      }
      
      setStatusText("Optimizing CV formatting...");

      // Call optimize-cv
      const optimizeRes = await fetch(`${supabaseUrl}/functions/v1/optimize-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          cv_text: extractedText,
          job_description: jobDescription
        })
      });
      const optimizeData = await optimizeRes.json();

      if (optimizeData.success) {
        setOptimizedText(optimizeData.optimized_cv_text);
        
        setStatusText("Saving optimized CV...");
        
        // 1. Fetch latest cv_id for this user
        const { data: latestCVs } = await supabase
          .from("cvs")
          .select("id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        let cvId = latestCVs && latestCVs.length > 0 ? latestCVs[0].id : null;

        // If no CV exists, insert a new CV first
        if (!cvId) {
          const { data: newCv, error: newCvError } = await supabase
            .from("cvs")
            .insert({
              user_id: session.user.id,
              extracted_text: extractedText,
              ats_score: atsScore || 0
            })
            .select("id")
            .single();
          if (newCv) {
            cvId = newCv.id;
          } else {
            console.error("Failed to create CV row:", newCvError);
          }
        }

        if (cvId) {
          // 2. Insert into optimized_cvs
          const { data: optData, error: optError } = await supabase
            .from("optimized_cvs")
            .insert({
              cv_id: cvId,
              job_description: jobDescription,
              optimized_text: optimizeData.optimized_cv_text,
              suggestions: optimizeData.changes_made || []
            })
            .select("id")
            .single();

          if (optData) {
            setOptimizedCvId(optData.id);
            setStatusText("Complete!");
          } else {
            console.error("Failed to save optimized CV:", optError);
            setStatusText("Failed to save optimized CV.");
          }
        } else {
          setStatusText("Complete (not saved)!");
        }
      } else {
        setStatusText("Complete!");
      }
    } catch (err) {
      setStatusText("Error during analysis.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    await exportPDF('Optimized_CV.pdf', optimizedText || extractedText || '', setStatusText);
  };

  // Loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-slate-400 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-slate-400 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js" strategy="afterInteractive" />
      <div className="container mx-auto px-4 py-8 max-w-3xl pb-24 md:pb-8">
        <div className="mb-10 text-center">
          <h1 className="font-outfit text-4xl font-bold text-white mb-2">Optimize CV</h1>
          <p className="text-slate-400">Tailor your resume formatting and content to a target job description.</p>
        </div>

        <div className="space-y-8">
          
          {/* Card 1: Upload */}
          <div className="glass-card p-6 border border-slate-800">
            <h2 className="font-outfit text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-orange-500">1.</span> Upload CV
            </h2>
            
            {file ? (
              <div className="flex items-center justify-between bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-orange-400 text-xs font-bold">{file.name.split('.').pop()?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={handleClearFile}
                  className="flex-shrink-0 ml-3 w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                  title="Remove file"
                >
                  <span className="text-red-400 text-sm font-bold">✕</span>
                </button>
              </div>
            ) : (
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-500 cursor-pointer"
              />
            )}
            {statusText && <p className="text-xs text-orange-400 mt-3">{statusText}</p>}
          </div>

          {/* Card 2: Job Description */}
          <div className="glass-card p-6 border border-slate-800">
            <h2 className="font-outfit text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-orange-500">2.</span> Job Description (required)
            </h2>
            <textarea 
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description here for tailored optimization (minimum 50 characters)..."
              className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 text-sm resize-none"
            ></textarea>
            {jobDescription.trim().length > 0 && jobDescription.trim().length < 50 && (
              <p className="text-xs text-red-400 mt-2 font-medium animate-pulse">
                Job description must be at least 50 characters (current: {jobDescription.trim().length}/50)
              </p>
            )}
          </div>

          {/* Responsive action button - Sticky on mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 z-50 md:static md:p-0 md:bg-transparent md:border-0 md:mt-6">
            <button 
              onClick={handleAnalyze}
              disabled={loading || !extractedText || jobDescription.trim().length < 50}
              className="w-full bg-white hover:bg-slate-200 text-slate-950 font-bold py-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full"></span>
                  Optimizing CV...
                </span>
              ) : "Optimize CV"}
            </button>
          </div>

        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="mt-8 space-y-6">
            <div className="glass-card p-6 space-y-4 animate-pulse border border-slate-850">
              <div className="h-6 bg-slate-900 rounded w-1/4"></div>
              <div className="h-4 bg-slate-900 rounded w-3/4"></div>
              <div className="space-y-2 pt-4">
                <div className="h-4 bg-slate-900 rounded"></div>
                <div className="h-4 bg-slate-900 rounded"></div>
                <div className="h-4 bg-slate-900 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        )}

        {/* Open Preview in New Tab Section */}
        {optimizedCvId && (
          <div className="mt-8 text-center glass-card p-8 border border-emerald-500/20">
            <h2 className="font-outfit text-2xl font-bold text-white mb-2">Optimized CV is Ready! 🎉</h2>
            <p className="text-slate-400 mb-6">Your resume has been tailored to the job description. Open the preview to view, modify, or download it.</p>
            <a 
              href={`/preview/${optimizedCvId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
            >
              Open Preview
            </a>
          </div>
        )}
      </div>
    </>
  );
}
