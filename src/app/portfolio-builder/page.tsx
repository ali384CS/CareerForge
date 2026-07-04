"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortfolioBuilderPage() {
  const [generating, setGenerating] = useState(false);
  const [portfolioReady, setPortfolioReady] = useState(false);
  const router = useRouter();

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setPortfolioReady(true);
    }, 2500);
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <div className="mb-12">
        <h1 className="font-outfit text-4xl font-bold text-white mb-2">Portfolio Auto-Builder</h1>
        <p className="text-slate-400 text-lg">Turn your CV bullets into a stunning 1-page website.</p>
      </div>

      {!portfolioReady ? (
        <div className="glass-card p-8 text-center max-w-2xl mx-auto border border-orange-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to build your digital presence?</h2>
          <p className="text-slate-400 mb-8">We will extract your top projects and skills from your optimized CV and generate a custom portfolio site. No coding required.</p>
          
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                Generating Portfolio...
              </span>
            ) : "Generate My Portfolio"}
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
              <span>✨</span> Your Portfolio is Ready!
            </h2>
            <button className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg transition-colors border border-slate-700">
              Publish & Get Link
            </button>
          </div>
          
          <div className="aspect-[16/9] w-full bg-slate-900 rounded-2xl border-4 border-slate-800 overflow-hidden shadow-2xl relative">
            {/* Mock Portfolio Preview */}
            <div className="absolute inset-0 p-8 flex flex-col justify-center items-center text-center bg-gradient-to-br from-slate-900 to-slate-800">
              <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">John Doe</h1>
              <h2 className="text-2xl text-orange-400 font-medium mb-8">Software Engineer & Tech Lead</h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-12">I build scalable systems and lead high-performing teams. Focused on cloud architecture and performance optimization.</p>
              
              <div className="grid grid-cols-3 gap-6 w-full max-w-3xl">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-white font-bold mb-2">Microservices Migration</h3>
                  <p className="text-xs text-slate-400">Migrated monolith to 15 microservices, improving uptime by 99.9%.</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-white font-bold mb-2">Latency Reduction</h3>
                  <p className="text-xs text-slate-400">Optimized database queries, reducing average latency by 40%.</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-white font-bold mb-2">CI/CD Pipeline</h3>
                  <p className="text-xs text-slate-400">Automated deployments, cutting release time from 2 days to 4 hours.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
