"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function AtsScorePage() {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  // Scorer results state
  const [score, setScore] = useState<number | null>(null);
  const [keywordsFound, setKeywordsFound] = useState<string[]>([]);
  const [keywordsMissing, setKeywordsMissing] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
        } else {
          setUser(session.user);
        }
      } catch {
        router.push("/auth");
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setStatusText("Extracting text...");

    try {
      const text = await extractTextFromFile(selectedFile);
      setExtractedText(text);
      setStatusText("CV uploaded successfully.");
    } catch (err: any) {
      setStatusText(`Error: ${err.message || "Failed to extract text."}`);
    }
  };

  const handleClear = () => {
    setFile(null);
    setExtractedText("");
    setJobDescription("");
    setScore(null);
    setKeywordsFound([]);
    setKeywordsMissing([]);
    setFeedback("");
    setStatusText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
              reject(new Error("PDF library loading. Try again in a moment."));
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
            reject(new Error("DOCX library loading. Try again in a moment."));
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
        reject(new Error("Only .pdf or .docx supported."));
      }
    });
  };

  const handleCalculateScore = async () => {
    if (!extractedText) return;
    setLoading(true);
    setStatusText("Calculating ATS score...");
    setScore(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatusText("Session expired. Please log in.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/analyze-cv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          cv_text: extractedText,
          job_description: jobDescription || null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScore(data.ats_score);
        setKeywordsFound(data.keywords_found || []);
        setKeywordsMissing(data.keywords_missing || []);
        setFeedback(data.overall_feedback || "");
        setStatusText("Score computed successfully.");
      } else {
        setStatusText(data.error || "Failed to calculate score.");
      }
    } catch (err: any) {
      console.error(err);
      setStatusText("Failed to query ATS scoring server.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-slate-400">Verifying session...</p>
      </div>
    );
  }

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js" strategy="afterInteractive" />
      
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-10 text-center md:text-left">
          <h1 className="font-outfit text-4xl font-bold text-white mb-2">Check ATS Score</h1>
          <p className="text-slate-400">Upload your CV to check compatibility and keyword coverage using our advanced ATS analyzer.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Form Side */}
          <div className="space-y-6">
            <div className="glass-card p-6 border border-slate-800">
              <h2 className="font-outfit text-lg font-bold text-white mb-4">1. Upload CV</h2>
              {file ? (
                <div className="flex items-center justify-between bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-blue-400 text-xs font-bold">{file.name.split('.').pop()?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClear}
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
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              )}
              {statusText && <p className="text-xs text-blue-400 mt-3">{statusText}</p>}
            </div>

            <div className="glass-card p-6 border border-slate-800">
              <h2 className="font-outfit text-lg font-bold text-white mb-2">2. Job Description (optional)</h2>
              <p className="text-xs text-slate-500 mb-4">Add job description for role-specific scoring (optional)</p>
              <textarea 
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here..."
                className="w-full h-36 bg-slate-950/50 border border-slate-850 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 text-sm resize-none"
              ></textarea>
            </div>

            <button 
              onClick={handleCalculateScore}
              disabled={loading || !extractedText}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Calculating..." : "Check ATS Score"}
            </button>
          </div>

          {/* Results Side */}
          <div className="space-y-6">
            {score !== null ? (
              <div className="glass-card p-6 border border-slate-800 animate-in fade-in duration-300">
                <h2 className="font-outfit text-lg font-bold text-white mb-6 text-center md:text-left">ATS Compatibility</h2>
                
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className={`relative h-32 w-32 rounded-full border-4 flex items-center justify-center ${score >= 75 ? 'border-emerald-500 bg-emerald-500/5' : score >= 40 ? 'border-amber-500 bg-amber-500/5' : 'border-red-500 bg-red-500/5'}`}>
                    <span className={`text-4xl font-outfit font-extrabold ${score >= 75 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                      {score}%
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Match Rating</span>
                </div>

                <div className="space-y-4 mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scoring Feedback</h4>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-850 italic">
                    "{feedback}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keywords Found</h4>
                    {keywordsFound.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {keywordsFound.map(k => <span key={k} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">{k}</span>)}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">None detected.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keywords Missing</h4>
                    {keywordsMissing.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {keywordsMissing.map(k => <span key={k} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">{k}</span>)}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 font-medium text-emerald-500">All matching!</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center border border-slate-800 min-h-[300px] flex flex-col justify-center items-center">
                <span className="text-4xl mb-4">📊</span>
                <h3 className="font-outfit text-lg font-bold text-white mb-2">Ready to Score</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Upload your resume and optionally add a target job description to run advanced ATS matching calculations.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
