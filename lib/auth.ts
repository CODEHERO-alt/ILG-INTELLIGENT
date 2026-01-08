import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";

/**
 * Creates a Supabase client for Server Components / Route Handlers
 * using the Next.js cookies() store.
 *
 * IMPORTANT:
 * @supabase/ssr now expects getAll/setAll cookie methods.
 */
export function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions);
            });
          } catch {
            // In Server Components, cookies() can be read-only in some contexts.
            // That's OK: auth still works for reads; writes happen in middleware/route handlers.
          }
        },
      },
    }
  );
}

/**
 * Admin/service-role Supabase client (server-only).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
export function getAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // no-op
        },
      },
    }
  );
}

export async function getAuthUser() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user ?? null;
}

/**
 * Admin check:
 * - must be logged in
 * - must exist in public.admin_users
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
