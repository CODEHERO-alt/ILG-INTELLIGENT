import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

/**
 * Supabase server client (uses anon key + request cookies)
 * Use this for "who is logged in" checks.
 */
export function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

/**
 * Admin/server client (service role). NEVER use in client components.
 * Use this for DB reads/writes once you've already verified auth/admin.
 */
export function getAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: {} }
  );
}

/**
 * Returns the current authenticated user (or null).
 * This is the consistent helper that other files can import safely.
 */
export async function getAuthUser() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user ?? null;
}

/**
 * Hard requirement: user must be logged in + must be admin.
 * (Admin is determined by app_metadata.role === "admin")
 */
export async function requireAdminUser() {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const isAdmin = user.app_metadata?.role === "admin";
  if (!isAdmin) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

/**
 * Cron protection.
 * - If CRON_SECRET is set, require Authorization Bearer <secret> or x-cron-secret header.
 * - If CRON_SECRET is NOT set, allow (useful for local dev), but recommended to set it in production.
 */
export function assertCronAuth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-cron-secret");

  const token =
    (authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : authHeader) || cronHeader;

  if (!token || token !== secret) {
    throw new Error("INVALID_CRON");
  }
}
