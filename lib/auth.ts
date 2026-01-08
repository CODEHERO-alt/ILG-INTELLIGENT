import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

export function getSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    }
  );
}

export function getAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {},
    }
  );
}

export async function requireAdminUser() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    throw new Error("UNAUTHENTICATED");
  }

  const admin = data.user.app_metadata?.role === "admin";
  if (!admin) {
    throw new Error("FORBIDDEN");
  }

  return data.user;
}

export function assertCronAuth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const auth =
    req.headers.get("authorization") ||
    req.headers.get("x-cron-secret");

  if (!auth || !auth.includes(secret)) {
    throw new Error("INVALID_CRON");
  }
}
