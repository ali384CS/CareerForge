"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Briefcase, 
  GraduationCap, 
  Sparkles, 
  Download, 
  Loader2, 
  User, 
  Globe 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { renderFormattedCV, exportPDF } from "@/lib/cv-formatter";
import { pageTransition, listContainer, listItem } from "@/lib/animations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        router.push("/login");
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
    setStatusText("Generating your CV with Gemini AI...");

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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className="flex-grow p-6 md:p-8 max-w-5xl mx-auto w-full pb-24"
    >
      {/* Title */}
      <div className="mb-8">
        <h1 className="font-outfit text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <span>📝</span> CV Builder
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Build a professional, ATS-optimized resume from scratch.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="space-y-6">

          {/* Personal Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-505" />
              <span>Personal Information</span>
            </h2>
            <div className="space-y-3">
              <Input
                label="Full Name *"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="LinkedIn"
                  type="url"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  placeholder="linkedin.com/in/johndoe"
                />
                <Input
                  label="GitHub"
                  type="url"
                  value={github}
                  onChange={e => setGithub(e.target.value)}
                  placeholder="github.com/johndoe"
                />
              </div>
            </div>
          </div>

          {/* Professional Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-505" />
              <span>Professional Summary</span>
            </h2>
            <textarea 
              value={summary} 
              onChange={e => setSummary(e.target.value)}
              className="w-full h-24 bg-slate-55 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-650 resize-none leading-relaxed"
              placeholder="A brief summary of your professional background. Leave blank to auto-generate from other details."
            />
          </div>

          {/* Education */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-505" />
                <span>Education</span>
              </h2>
              <button 
                onClick={addEducation} 
                className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/20 px-3 py-1.5 rounded-lg hover:bg-indigo-100/50 transition-colors"
              >
                + Add
              </button>
            </div>
            
            <div className="space-y-4">
              {education.map((edu, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-150 dark:border-slate-850 relative">
                  {education.length > 1 && (
                    <button 
                      onClick={() => removeEducation(idx)} 
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={edu.degree} 
                      onChange={e => updateEducation(idx, 'degree', e.target.value)}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600"
                      placeholder="Degree (e.g. BS Computer Science)" 
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input 
                        type="text" 
                        value={edu.institution} 
                        onChange={e => updateEducation(idx, 'institution', e.target.value)}
                        className="col-span-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600"
                        placeholder="Institution" 
                      />
                      <input 
                        type="text" 
                        value={edu.year} 
                        onChange={e => updateEducation(idx, 'year', e.target.value)}
                        className="bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600"
                        placeholder="Year" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-505" />
              <span>Skills</span>
            </h2>
            <textarea 
              value={skills} 
              onChange={e => setSkills(e.target.value)}
              className="w-full h-20 bg-slate-55 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-650 resize-none leading-relaxed"
              placeholder="e.g. JavaScript, React, Node.js, Python, SQL, Git" 
            />
          </div>

          {/* Experience */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-505" />
                <span>Work / Project Experience</span>
              </h2>
              <button 
                onClick={addExperience} 
                className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/20 px-3 py-1.5 rounded-lg hover:bg-indigo-100/50 transition-colors"
              >
                + Add
              </button>
            </div>
            
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-150 dark:border-slate-850 relative">
                  {experience.length > 1 && (
                    <button 
                      onClick={() => removeExperience(idx)} 
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={exp.title} 
                        onChange={e => updateExperience(idx, 'title', e.target.value)}
                        className="bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600"
                        placeholder="Role / Project Title" 
                      />
                      <input 
                        type="text" 
                        value={exp.company} 
                        onChange={e => updateExperience(idx, 'company', e.target.value)}
                        className="bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600"
                        placeholder="Company" 
                      />
                    </div>
                    <input 
                      type="text" 
                      value={exp.date} 
                      onChange={e => updateExperience(idx, 'date', e.target.value)}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600"
                      placeholder="Date range (e.g. Jan 2023 - Present)" 
                    />
                    <textarea 
                      value={exp.bullets} 
                      onChange={e => updateExperience(idx, 'bullets', e.target.value)}
                      className="w-full h-20 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 resize-none"
                      placeholder="Key achievements (one per line)" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-505" />
              <span>Languages</span>
            </h2>
            <input 
              type="text" 
              value={languages} 
              onChange={e => setLanguages(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600"
              placeholder="e.g. English (Native), Urdu (Fluent)" 
            />
          </div>

          {/* Target JD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-550" />
              <span>Target Job Description (Optional)</span>
            </h2>
            <textarea 
              value={targetJD} 
              onChange={e => setTargetJD(e.target.value)}
              className="w-full h-28 bg-slate-55 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg p-3.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-650 resize-none leading-relaxed"
              placeholder="Paste a job description to auto-tailor keywords for this specific role..." 
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={loading || !fullName.trim()}
            className="w-full h-[48px] rounded-xl flex items-center justify-center gap-2 font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <span>Generate CV</span>
            )}
          </Button>
          {statusText && <p className="text-xs text-center text-indigo-650 dark:text-indigo-400 mt-2 font-medium">{statusText}</p>}
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6">
          {generatedCV ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
                <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">Generated CV Preview</h2>
                <Button 
                  onClick={downloadPDF}
                  size="sm"
                  className="rounded-lg text-xs font-bold font-outfit h-[32px] px-3.5 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </Button>
              </div>
              
              <div className="bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 rounded-xl overflow-x-auto shadow-inner max-h-[900px] overflow-y-auto">
                <div id="cv-builder-preview" className="bg-white mx-auto text-slate-900 p-8 sm:p-10 font-serif border" style={{maxWidth: '800px', minHeight: '1122px'}}>
                  {renderFormattedCV(generatedCV)}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-12 shadow-sm text-center min-h-[350px] flex flex-col justify-center items-center">
              <FileText className="w-12 h-12 text-slate-350 mb-4" />
              <h3 className="font-outfit text-lg font-bold text-slate-800 dark:text-slate-200">CV Preview</h3>
              <p className="text-slate-450 text-xs max-w-xs mx-auto mt-2">
                Fill out the resume details on the left, then click "Generate CV" to view your styled PDF preview here.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
