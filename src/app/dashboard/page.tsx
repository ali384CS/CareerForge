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
      }
    } catch {}
  }, []);

  // Persist results to sessionStorage whenever they change
  useEffect(() => {
    if (extractedText || optimizedText || atsScore !== null) {
      try {
        sessionStorage.setItem("dashboard_results", JSON.stringify({
          extractedText, jobDescription, atsScore, keywordsFound, keywordsMissing, optimizedText
        }));
      } catch {}
    }
  }, [extractedText, jobDescription, atsScore, keywordsFound, keywordsMissing, optimizedText]);

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
      
      // Call analyze-cv
      const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-cv`, {
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
      const analyzeData = await analyzeRes.json();
      
      // Defensively check all response shapes
      const payload = analyzeData.data || analyzeData;
      const extractedScore = payload.ats_score ?? payload.score;
      
      if (extractedScore !== undefined && extractedScore !== null) {
        setAtsScore(extractedScore);
        setKeywordsFound(payload.keywords_found || []);
        setKeywordsMissing(payload.keywords_missing || []);
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
      }
      
      setStatusText("Complete!");
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
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h1 className="font-outfit text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">Upload your CV and let the AI do the heavy lifting.</p>
          </div>
          
          {(optimizedText || extractedText) && (
            <button 
              onClick={() => {
                localStorage.setItem('cv_for_jobs', optimizedText || extractedText);
                router.push('/jobs');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
            >
              Find Matching Jobs
            </button>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Left Column: Input */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="font-outfit text-xl font-bold text-white mb-4">1. Upload CV</h2>
              
              {file ? (
                /* File selected state — show file info + cancel button */
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
                /* No file selected — show upload input */
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

            <div className="glass-card p-6">
              <h2 className="font-outfit text-xl font-bold text-white mb-4">2. Job Description (Optional)</h2>
              <textarea 
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here for tailored ATS scoring..."
                className="w-full h-32 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 text-sm resize-none"
              ></textarea>
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading || !extractedText}
              className="w-full bg-white hover:bg-slate-200 text-slate-950 font-bold py-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Analyze & Optimize"}
            </button>
          </div>

          {/* Right Column: Output */}
          <div className="space-y-6">
            {atsScore !== null && (
              <div className="glass-card p-6">
                <h2 className="font-outfit text-xl font-bold text-white mb-4">ATS Score</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`text-5xl font-outfit font-bold ${atsScore >= 80 ? 'text-emerald-400' : atsScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {atsScore}%
                  </div>
                  <div className="text-sm text-slate-400 uppercase tracking-wide">Match Rate</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keywords Found</h4>
                    <div className="flex flex-wrap gap-1">
                      {keywordsFound.map(k => <span key={k} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md">{k}</span>)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keywords Missing</h4>
                    <div className="flex flex-wrap gap-1">
                      {keywordsMissing.map(k => <span key={k} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md">{k}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Width: Optimized CV Preview */}
        {optimizedText && (
          <div className="mt-8 space-y-8">
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-outfit text-xl font-bold text-white">Your Optimized CV</h2>
                <button 
                  onClick={downloadPDF}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm shadow-md"
                >
                  Download PDF
                </button>
              </div>
              
              <div className="bg-slate-200 p-8 rounded-xl overflow-x-auto shadow-inner max-h-[800px] overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                {/* White A4 paper look */}
                <div id="cv-preview-container" className="bg-white mx-auto text-slate-900 p-10 font-serif" style={{maxWidth: '800px', minHeight: '1122px'}}>
                  {renderFormattedCV(optimizedText)}
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </>
  );
}
