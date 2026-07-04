"use client";

import { useState } from "react";

export default function NegotiationSimulator() {
  const [active, setActive] = useState(false);
  const [messages, setMessages] = useState<{sender: 'bot' | 'user', text: string}[]>([
    { sender: 'bot', text: "Hello! I am simulating the HR manager at your target company. Based on market data, I'm prepared to offer you 15LPA. How do you respond?" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { sender: 'user', text: input }]);
    setInput("");
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: "That's a fair point about your cloud migration experience. However, our band max is 18LPA. Can we meet at 17LPA with a joining bonus?" 
      }]);
    }, 1500);
  };

  if (!active) {
    return (
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <h3 className="font-outfit text-xl font-bold text-white">Salary Negotiation Simulator</h3>
          <p className="text-sm text-slate-400">Practice your counter-offer based on live market data.</p>
        </div>
        <button onClick={() => setActive(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg">
          Start Practice
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 border border-emerald-500/30 flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-4">
        <div>
          <h3 className="font-outfit text-xl font-bold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Negotiation Simulator
          </h3>
          <p className="text-xs text-slate-400">Target Role: SDE II | Avg Market: 18-22LPA</p>
        </div>
        <button onClick={() => setActive(false)} className="text-slate-400 hover:text-white text-sm">Close</button>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl p-3 text-sm ${msg.sender === 'user' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your counter-offer response..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        />
        <button onClick={handleSend} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
          Send
        </button>
      </div>
    </div>
  );
}
