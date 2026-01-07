// lib/auth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

/**
 * Internal helper: create a Supabase server client bound to Next.js cookies.
 */
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL or anon key not configured on server");
  }

  const cookieStore = cookies();

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}

/**
 * Get the currently authenticated user (or null) from Supabase.
 */
export async function getAuthUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

/**
 * Require that the current user exists AND is present in admin_users.
 * If not, redirect to login with redirect=/dashboard.
 */
export async function requireAdminUser() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?redirect=/dashboard");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Error querying admin_users:", adminError);
    redirect("/login?redirect=/dashboard");
  }

  if (!admin) {
    redirect("/login?redirect=/dashboard");
  }

  return user;
}

/**
 * Used by cron job API routes to ensure only Vercel Cron (with the correct
 * shared secret) can call the job endpoints.
 */
export function assertCronAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET_TOKEN;

  if (!expected) {
    throw new Error("CRON_SECRET_TOKEN is not configured on the server");
  }

  const provided =
    req.headers.get("x-cron-secret") || req.headers.get("X-Cron-Secret");

  if (provided !== expected) {
    // We throw here so the route returns a 500 / can catch and respond 401
    throw new Error("Unauthorized cron caller: invalid cron secret");
  }
}
