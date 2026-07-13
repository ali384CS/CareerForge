"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppSidebar from "./AppSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hideSidebar = 
    pathname === "/" || 
    pathname === "/auth" || 
    pathname.startsWith("/preview");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // If user is not logged in, or we are on public pages, just render full-width content
  if (!user || hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-[calc(100vh-4rem)]">
      <AppSidebar />
      <div className="flex-1 min-w-0 bg-slate-950 text-slate-100">
        {children}
      </div>
    </div>
  );
}
