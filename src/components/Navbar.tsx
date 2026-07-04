"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    // Instantly redirect for a snappy UX, then log out in the background
    router.push("/");
    setUser(null);
    try {
      localStorage.removeItem("cv_for_jobs");
      sessionStorage.removeItem("dashboard_results");
    } catch (e) {
      console.error("Failed to clear storage on sign-out:", e);
    }
    await supabase.auth.signOut();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5 font-outfit text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-80">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-orange-500">
            <path d="M16 2H8C5.8 2 4 3.8 4 6v12c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4V6c0-2.2-1.8-4-4-4z" />
            <path d="M12 7c-1.5 2-2.5 3.5-2.5 5.5s1.1 3.5 2.5 3.5 2.5-1.5 2.5-3.5S13.5 9 12 7z" fill="currentColor" className="text-orange-500" />
            <path d="M12 11c-.5.8-1 1.5-1 2.2s.4 1.3 1 1.3 1-.6 1-1.3-.5-1.4-1-2.2z" fill="currentColor" className="text-amber-400" />
          </svg>
          <span>CareerForge</span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Home
          </Link>
          {user && (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/jobs" className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors">
                Find Jobs
              </Link>
              <Link href="/cv-builder" className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
                CV Builder
              </Link>
              <Link href="/portfolio-builder" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                Portfolio Builder
              </Link>
            </>
          )}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          {loading ? (
            /* Skeleton placeholder while session is loading — prevents flash */
            <div className="h-9 w-28 rounded-full bg-slate-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <span className="hidden md:block text-xs font-medium text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                {user.email}
              </span>
              <button 
                onClick={handleSignOut}
                className="text-sm font-medium text-slate-300 hover:text-red-400 transition-colors"
              >
                Log Out
              </button>
            </div>
          ) : (
            <Link 
              href="/auth" 
              className="text-sm font-semibold bg-white text-slate-950 px-5 py-2 rounded-full hover:bg-slate-200 transition-colors shadow-sm"
            >
              Sign Up / Log In
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
