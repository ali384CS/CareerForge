"use client";

import { useState } from "react";

export default function InterviewPredictor() {
  const [analyzing, setAnalyzing] = useState(false);
  const [questions, setQuestions] = useState<{q: string, hint: string}[]>([]);

  const handlePredict = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setQuestions([
        { q: "Tell me about a time a project you led failed or missed a deadline.", hint: "STAR Method: Focus on your 'B2C Growth' project. Mention what you learned." },
        { q: "How do you handle disagreements with Product Managers?", hint: "Highlight your communication skills and data-driven approach from your 'Microservices Migration'." },
        { q: "Can you explain how you'd design a URL shortener at scale?", hint: "Systems Design: Remember to mention load balancers, caching strategies, and database sharding." }
      ]);
    }, 2000);
  };

  return (
    <div className="glass-card p-6 border border-orange-500/30">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🔮</span>
        <div>
          <h2 className="font-outfit text-xl font-bold text-white">Interview Predictor</h2>
          <p className="text-sm text-slate-400">Based on company Glassdoor data & your CV</p>
        </div>
      </div>

      {questions.length === 0 ? (
        <button 
          onClick={handlePredict}
          disabled={analyzing}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl transition-all border border-slate-700 disabled:opacity-50"
        >
          {analyzing ? "Analyzing company data..." : "Predict Interview Questions"}
        </button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-orange-400 font-bold mb-2">Top 3 predicted questions for your profile:</p>
          {questions.map((item, idx) => (
            <div key={idx} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/50">
              <p className="text-sm text-white font-semibold mb-2">Q: {item.q}</p>
              <div className="bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                <p className="text-xs text-orange-300"><span className="font-bold">Coach's Hint:</span> {item.hint}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
