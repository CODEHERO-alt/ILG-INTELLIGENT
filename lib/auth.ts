import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

type CookieOptions = Record<string, any>;

export function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        // In Server Components, Next's cookies() is read-only.
        // We keep set/remove as no-ops but typed to satisfy TS + Supabase SSR interface.
        set: (_name: string, _value: string, _options?: CookieOptions) => {},
        remove: (_name: string, _options?: CookieOptions) => {},
      },
    }
  );
}

export function getAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: {} as any }
  );
}

export async function getAuthUser() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user ?? null;
}

/**
 * World-class admin check:
 * - Must be logged in
 * - Must exist in admin_users table
 * This avoids relying on user metadata.
 */
export async function requireAdminUser() {
  const user = await getAuthUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const adminDb = getAdminSupabaseClient();
  const { data, error } = await adminDb
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error("ADMIN_CHECK_FAILED");
  if (!data) throw new Error("FORBIDDEN");

  return user;
}

/**
 * Cron protection:
 * If CRON_SECRET is set, require:
 * - Authorization: Bearer <secret> OR
 * - x-cron-secret: <secret>
 */
export function assertCronAuth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-cron-secret");

  const token =
    (authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : authHeader?.trim()) || cronHeader?.trim();

  if (!token || token !== secret) {
    throw new Error("INVALID_CRON");
  }
}
