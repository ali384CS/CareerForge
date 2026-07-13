"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, Hammer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { pageTransition } from "@/lib/animations";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setInfoMessage("Registration successful! Please check your email to verify your account.");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-12"
    >
      <div className="bg-white border border-slate-200/80 w-full max-w-md p-8 rounded-2xl shadow-sm">
        
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#6366F1] mb-3">
            <Hammer className="w-5 h-5" />
          </div>
          <h1 className="font-outfit text-2xl font-bold text-[#171717]">Create Account</h1>
          <p className="text-[#6B7280] text-xs mt-1">Start forging your career journey.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-655 font-medium">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-650 font-medium">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password (min. 6 characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />

          <div className="pt-2">
            <Button type="submit" loading={loading} className="w-full h-[42px] bg-[#6366F1] hover:bg-[#4F46E5] flex items-center justify-center gap-2 rounded-xl text-sm">
              <UserPlus className="w-4 h-4" /> Sign Up
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-[#6B7280]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#6366F1] hover:underline font-semibold">
            Log In
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
