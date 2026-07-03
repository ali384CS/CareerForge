"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import { formatCVText, renderFormattedCV, exportPDF } from "@/lib/cv-formatter";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface Education {
  degree: string;
  institution: string;
  year: string;
}

interface Experience {
  title: string;
  company: string;
  date: string;
  bullets: string;
}

export default function CVBuilderPage() {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [targetJD, setTargetJD] = useState("");

  // Repeatable sections
  const [education, setEducation] = useState<Education[]>([{ degree: "", institution: "", year: "" }]);
  const [experience, setExperience] = useState<Experience[]>([{ title: "", company: "", date: "", bullets: "" }]);

  // Output
  const [generatedCV, setGeneratedCV] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        router.push("/auth");
      }
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Education helpers
  const addEducation = () => setEducation([...education, { degree: "", institution: "", year: "" }]);
  const removeEducation = (idx: number) => setEducation(education.filter((_, i) => i !== idx));
  const updateEducation = (idx: number, field: keyof Education, value: string) => {
    const updated = [...education];
    updated[idx][field] = value;
    setEducation(updated);
  };

  // Experience helpers
  const addExperience = () => setExperience([...experience, { title: "", company: "", date: "", bullets: "" }]);
  const removeExperience = (idx: number) => setExperience(experience.filter((_, i) => i !== idx));
  const updateExperience = (idx: number, field: keyof Experience, value: string) => {
    const updated = [...experience];
    updated[idx][field] = value;
    setExperience(updated);
  };

  const handleGenerate = async () => {
    if (!fullName.trim()) {
      setStatusText("Please enter your full name.");
      return;
    }
    setLoading(true);
    setStatusText("Generating your CV...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        full_name: fullName,
        email,
        phone,
        linkedin,
        github,
        summary,
        skills,
        languages,
        education: education.filter(e => e.degree || e.institution),
        experience: experience.filter(e => e.title || e.company || e.bullets),
        target_job_description: targetJD
      };

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.cv_text) {
        setGeneratedCV(data.cv_text);
        setStatusText("CV generated successfully!");
      } else {
        setStatusText(data.error || "Failed to generate CV.");
      }
    } catch (err) {
      console.error(err);
      setStatusText("Error generating CV. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    await exportPDF(`${fullName.replace(/\s+/g, '_')}_CV.pdf`, generatedCV, setStatusText);
  };

  if (checkingAuth || !user) {
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
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-outfit text-3xl font-bold text-white mb-2">CV Builder</h1>
          <p className="text-slate-400">Build a professional, ATS-optimized CV from scratch.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column: Form */}
          <div className="space-y-6">

            {/* Personal Info */}
            <div className="glass-card p-6">
              <h2 className="font-outfit text-lg font-bold text-white mb-4">Personal Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Full Name *</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Phone</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="+1 555 123 4567" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">LinkedIn</label>
                    <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="linkedin.com/in/johndoe" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">GitHub</label>
                    <input type="url" value={github} onChange={e => setGithub(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="github.com/johndoe" />
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            <div className="glass-card p-6">
              <h2 className="font-outfit text-lg font-bold text-white mb-4">Professional Summary</h2>
              <textarea value={summary} onChange={e => setSummary(e.target.value)}
                className="w-full h-24 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                placeholder="A brief summary of your professional background and goals. Leave blank to auto-generate from your other details." />
            </div>

            {/* Education */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit text-lg font-bold text-white">Education</h2>
                <button onClick={addEducation} className="text-xs font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg transition-colors">
                  + Add
                </button>
              </div>
              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div key={idx} className="bg-slate-950/30 rounded-xl p-4 border border-slate-800 relative">
                    {education.length > 1 && (
                      <button onClick={() => removeEducation(idx)} className="absolute top-2 right-2 text-red-400/60 hover:text-red-400 text-xs">✕</button>
                    )}
                    <div className="space-y-2">
                      <input type="text" value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)}
                        className="w-full bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                        placeholder="Degree (e.g., BS Computer Science)" />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" value={edu.institution} onChange={e => updateEducation(idx, 'institution', e.target.value)}
                          className="col-span-2 bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                          placeholder="Institution" />
                        <input type="text" value={edu.year} onChange={e => updateEducation(idx, 'year', e.target.value)}
                          className="bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                          placeholder="Year" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="glass-card p-6">
              <h2 className="font-outfit text-lg font-bold text-white mb-4">Skills</h2>
              <textarea value={skills} onChange={e => setSkills(e.target.value)}
                className="w-full h-20 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                placeholder="e.g., JavaScript, React, Node.js, Python, SQL, Docker, Git" />
            </div>

            {/* Experience */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit text-lg font-bold text-white">Work / Project Experience</h2>
                <button onClick={addExperience} className="text-xs font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg transition-colors">
                  + Add
                </button>
              </div>
              <div className="space-y-4">
                {experience.map((exp, idx) => (
                  <div key={idx} className="bg-slate-950/30 rounded-xl p-4 border border-slate-800 relative">
                    {experience.length > 1 && (
                      <button onClick={() => removeExperience(idx)} className="absolute top-2 right-2 text-red-400/60 hover:text-red-400 text-xs">✕</button>
                    )}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={exp.title} onChange={e => updateExperience(idx, 'title', e.target.value)}
                          className="bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                          placeholder="Role / Project Title" />
                        <input type="text" value={exp.company} onChange={e => updateExperience(idx, 'company', e.target.value)}
                          className="bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                          placeholder="Company / Organization" />
                      </div>
                      <input type="text" value={exp.date} onChange={e => updateExperience(idx, 'date', e.target.value)}
                        className="w-full bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                        placeholder="Date range (e.g., Jan 2023 - Present)" />
                      <textarea value={exp.bullets} onChange={e => updateExperience(idx, 'bullets', e.target.value)}
                        className="w-full h-20 bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                        placeholder="Key responsibilities/achievements (one per line)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="glass-card p-6">
              <h2 className="font-outfit text-lg font-bold text-white mb-4">Languages</h2>
               <input type="text" value={languages} onChange={e => setLanguages(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="e.g., English (Native), Spanish (Intermediate), French (Basic)" />
            </div>

            {/* Target JD */}
            <div className="glass-card p-6">
              <h2 className="font-outfit text-lg font-bold text-white mb-4">Target Job Description (Optional)</h2>
              <textarea value={targetJD} onChange={e => setTargetJD(e.target.value)}
                className="w-full h-28 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                placeholder="Paste a job description to tailor your CV for this specific role..." />
            </div>

            {/* Generate Button */}
            <button 
              onClick={handleGenerate}
              disabled={loading || !fullName.trim()}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate CV"}
            </button>
            {statusText && <p className="text-xs text-center text-orange-400 mt-2">{statusText}</p>}
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-6">
            {generatedCV ? (
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-outfit text-xl font-bold text-white">Your Generated CV</h2>
                  <button 
                    onClick={downloadPDF}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm shadow-md"
                  >
                    Download PDF
                  </button>
                </div>
                
                <div className="bg-slate-200 p-6 rounded-xl overflow-x-auto shadow-inner max-h-[900px] overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div id="cv-builder-preview" className="bg-white mx-auto text-slate-900 p-10 font-serif" style={{maxWidth: '800px', minHeight: '1122px'}}>
                    {renderFormattedCV(generatedCV)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-orange-400 text-2xl">📄</span>
                </div>
                <h3 className="font-outfit text-lg font-bold text-white mb-2">Preview Your CV</h3>
                <p className="text-slate-400 text-sm">Fill in the form on the left and click &quot;Generate CV&quot; to see a professionally formatted preview here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
