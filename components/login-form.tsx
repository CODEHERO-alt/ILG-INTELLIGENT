"use client";

import { useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon);
}

export default function LoginForm() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function login() {
    setErrorMsg(null);

    if (!supabase) {
      setErrorMsg(
        "Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Environment Variables."
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      window.location.href = "/dashboard";
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10">
      {/* Background */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0b1020]" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute top-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.10),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.06),transparent_45%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* Content */}
      <div className="relative w-full max-w-[420px]">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            ILG • Admin Access
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Use your admin email and password to access the dashboard.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <div className="p-5 sm:p-6">
            <label className="block text-xs font-medium text-white/70">
              Email
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
              placeholder="name@company.com"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="mt-4 block text-xs font-medium text-white/70">
              Password
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
              placeholder="••••••••••"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {errorMsg ? (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {errorMsg}
              </div>
            ) : null}

            <button
              onClick={login}
              disabled={loading || !email || !password}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-white/15 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="mt-4 text-center text-xs text-white/45">
              Protected area • If you don’t have access, contact the admin.
            </div>
          </div>

          <div className="border-t border-white/10 px-5 sm:px-6 py-4">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>© {new Date().getFullYear()} Pehchaan Media</span>
              <span className="text-white/40">ILG</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
