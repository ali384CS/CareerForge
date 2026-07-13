"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Hammer, LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    router.push("/login");
    try {
      localStorage.removeItem("cv_for_jobs");
      sessionStorage.removeItem("dashboard_results");
    } catch (e) {
      console.error(e);
    }
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 dark:border-slate-850 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-outfit text-xl font-bold tracking-tight text-slate-900 dark:text-white transition-opacity hover:opacity-85"
        >
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/10">
            <Hammer className="w-5 h-5" />
          </div>
          <span>CareerForge</span>
        </Link>

        {/* User profile / Auth options */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-850">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-500 hover:text-red-500 hover:bg-red-50/50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/10 flex items-center gap-2 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Log Out</span>
              </Button>
            </div>
          ) : (
            pathname !== "/login" && (
              <Link href="/login">
                <Button size="sm">Sign In</Button>
              </Link>
            )
          )}
        </div>

      </div>
    </header>
  );
}
