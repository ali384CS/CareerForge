"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Hammer, ArrowRight, ShieldCheck, Cpu, Briefcase, Download } from "lucide-react";
import { pageTransition, listContainer, listItem } from "@/lib/animations";

export default function Home() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={pageTransition}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between"
    >
      {/* Header */}
      <header className="w-full border-b border-slate-100 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-outfit text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            <div className="h-8 w-8 rounded-lg bg-indigo-650 flex items-center justify-center text-white shadow-sm">
              <Hammer className="w-4.5 h-4.5" />
            </div>
            <span>CareerForge</span>
          </Link>
          <Link href="/dashboard">
            <button className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold px-4 py-2 rounded-xl transition-all text-xs shadow-sm active:scale-97">
              Dashboard
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-6 max-w-5xl mx-auto w-full text-center space-y-12">
        <div className="space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs font-semibold text-indigo-755 dark:text-indigo-400 tracking-wide uppercase">
            Introducing CareerForge 2.0
          </div>
          
          <h1 className="font-outfit text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight max-w-3xl mx-auto">
            Transform Your CV <br/>
            <span className="text-indigo-600 dark:text-indigo-400">
              Into a Job Magnet
            </span>
          </h1>
          
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
            Personalized AI resume optimizer, interactive compatibility checks, and automated job matching templates. Verify your profile against target recruitment metrics.
          </p>
        </div>
        
        <div className="pt-2">
          <Link href="/dashboard">
            <button className="inline-flex items-center gap-2 font-bold bg-indigo-600 hover:bg-indigo-755 text-white px-8 py-3.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-97">
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-16 border-t border-slate-200 dark:border-slate-900">
          
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl text-left space-y-4 shadow-sm hover:border-indigo-500/30 hover:scale-[1.01] transition-all">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/35">
              <ShieldCheck className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
            </div>
            <h3 className="font-outfit font-bold text-slate-855 dark:text-white text-base">ATS Compatibility</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
              Interactive cosine TF-IDF scoring and detailed keyword checklists to identify resume optimization weaknesses.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl text-left space-y-4 shadow-sm hover:border-indigo-500/30 hover:scale-[1.01] transition-all">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/35">
              <Cpu className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
            </div>
            <h3 className="font-outfit font-bold text-slate-855 dark:text-white text-base">Gemini Optimization</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
              One-click resume rephrasing and structure alignment matching the target recruitment roles constraints.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl text-left space-y-4 shadow-sm hover:border-indigo-500/30 hover:scale-[1.01] transition-all">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/35">
              <Briefcase className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
            </div>
            <h3 className="font-outfit font-bold text-slate-855 dark:text-white text-base">Developer Matches</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
              Fallback chains connecting local and international job aggregators to fetch matches based on technical keywords.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl text-left space-y-4 shadow-sm hover:border-indigo-500/30 hover:scale-[1.01] transition-all">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/35">
              <Download className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
            </div>
            <h3 className="font-outfit font-bold text-slate-855 dark:text-white text-base">Perfect PDF Export</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
              Rebuild, compile, and format single-page plain-text CV sheets to save or download in recruiter-approved PDF format.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-100 dark:border-slate-900 py-6 text-center text-[10px] text-slate-400">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} CareerForge - AI Powered Resume Platform.</p>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-indigo-500 transition-colors">Features</a>
            <a href="/login" className="hover:text-indigo-500 transition-colors">Sign In</a>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
