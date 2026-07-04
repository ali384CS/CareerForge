import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 pb-16 px-6">
      
      {/* Hero Section */}
      <section className="w-full max-w-4xl text-center space-y-8 mb-32">
        <div className="inline-block px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-sm font-medium text-slate-300 mb-4 tracking-wide">
          Introducing CareerForge 2.0
        </div>
        
        <h1 className="font-outfit text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
          Transform Your CV <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
            Into a Job Magnet
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
          AI-powered analysis, instant ATS scoring, and intelligent rewriting. 
          Get actionable feedback and a beautifully formatted PDF—ready to send to recruiters.
        </p>
        
        <div className="pt-8">
          <Link 
            href="/dashboard" 
            className="inline-block font-semibold bg-white text-slate-950 px-8 py-4 rounded-full text-lg hover:bg-slate-200 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="font-outfit text-3xl md:text-4xl font-bold text-white mb-4">
            Everything You Need to Land Interviews
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Our AI engine dissects your CV, identifies weak spots, and perfectly formats it for ATS systems.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:bg-slate-900 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6 border border-orange-500/20">
                <span className="text-orange-400 font-bold font-outfit text-xl">01</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-outfit">Smart CV Analysis</h3>
              <p className="text-slate-400 leading-relaxed text-xs md:text-sm">
                Instant ATS compatibility score, keyword gap detection, and section-by-section feedback so you know exactly what recruiters see.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:bg-slate-900 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                <span className="text-amber-400 font-bold font-outfit text-xl">02</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-outfit">AI Optimization</h3>
              <p className="text-slate-400 leading-relaxed text-xs md:text-sm">
                One-click rewriting powered by advanced heuristics. We rephrase your bullet points, add power verbs, and ensure strict plain-text formatting.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:bg-slate-900 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6 border border-orange-500/20">
                <span className="text-orange-400 font-bold font-outfit text-xl">03</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-outfit">CV Builder</h3>
              <p className="text-slate-400 leading-relaxed text-xs md:text-sm mb-4">
                No existing resume? Use our structured form builder to draft a stunning CV from scratch, tailored to any job.
              </p>
            </div>
            <div className="pt-2">
              <Link 
                href="/cv-builder" 
                className="inline-block text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Launch Builder →
              </Link>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:bg-slate-900 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                <span className="text-amber-400 font-bold font-outfit text-xl">04</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-outfit">Perfect PDF Export</h3>
              <p className="text-slate-400 leading-relaxed text-xs md:text-sm">
                Your optimized text is instantly transformed into a stunning, professionally structured PDF document that you can download immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="w-full max-w-4xl text-center space-y-6 mt-32 mb-16">
        <h2 className="font-outfit text-3xl font-bold text-white">About Us</h2>
        <p className="text-slate-400 text-lg leading-relaxed">
          CareerForge was built to level the playing field. We believe that brilliant candidates shouldn't be rejected just because they don't know the obscure formatting rules of modern Applicant Tracking Systems (ATS). Our mission is to transform your professional experience into a perfectly optimized document that guarantees your resume gets seen by human eyes.
        </p>
      </section>

      {/* Menu / Pricing Section */}
      <section id="menu" className="w-full max-w-4xl text-center space-y-6 mt-16 mb-16">
        <h2 className="font-outfit text-3xl font-bold text-white mb-8">Our Plans</h2>
        <div className="grid md:grid-cols-2 gap-8 text-left">
          <div className="glass-card p-8 border-t-4 border-t-orange-500">
            <h3 className="font-outfit text-2xl font-bold text-white mb-2">Basic</h3>
            <p className="text-slate-400 mb-6">Perfect for students and early-career professionals.</p>
            <div className="text-3xl font-bold text-white mb-6">Free</div>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-orange-400">✓</span> ATS Scoring</li>
              <li className="flex gap-2"><span className="text-orange-400">✓</span> Keyword Gap Analysis</li>
              <li className="flex gap-2 text-slate-600"><span className="text-slate-600">✗</span> AI Rewriting</li>
            </ul>
          </div>
          
          <div className="glass-card p-8 border-t-4 border-t-amber-500 relative">
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">Pro</div>
            <h3 className="font-outfit text-2xl font-bold text-white mb-2">Premium</h3>
            <p className="text-slate-400 mb-6">For serious job seekers who want the edge.</p>
            <div className="text-3xl font-bold text-white mb-6">$9<span className="text-sm font-normal text-slate-500">/mo</span></div>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-orange-400">✓</span> ATS Scoring</li>
              <li className="flex gap-2"><span className="text-orange-400">✓</span> Keyword Gap Analysis</li>
              <li className="flex gap-2"><span className="text-orange-400">✓</span> Unlimited AI Rewriting</li>
              <li className="flex gap-2"><span className="text-orange-400">✓</span> PDF Export</li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}
