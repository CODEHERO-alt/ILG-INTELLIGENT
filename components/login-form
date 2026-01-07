"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase URL or anon key is missing. Check your environment variables."
    );
  }

  // Browser client that syncs auth via cookies for SSR
  return createBrowserClient(url, key);
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Supabase sign-in error:", error);
        setError(error.message);
        return;
      }

      // Auth success → go to dashboard
      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      console.error("Unexpected login error:", err);
      setError(
        err?.message ||
          "Unexpected error while signing in. Please contact the admin."
      );
    } finally {
      // Always clear "Signing in..." state, even on error
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto border border-slate-800 rounded-2xl bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
      <h1 className="text-xl font-semibold mb-1">
        Instagram Lead Engine Login
      </h1>
      <p className="text-xs text-slate-400 mb-4">
        Internal tool for Pehchaan Media – 7-Day Website Revenue Sprint.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            placeholder="you@pehchaanmedia.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/70 rounded-md px-2 py-1">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-sm font-medium"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-[11px] text-slate-500 text-center">
          Use the admin email/password you created in Supabase Auth.
        </p>
      </form>
    </div>
  );
}
