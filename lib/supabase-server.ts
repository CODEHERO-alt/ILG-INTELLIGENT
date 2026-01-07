import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side: use service key
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // noop for now – server routes don't need to set cookies
        },
        remove() {
          // noop
        }
      },
      global: {
        headers: {
          "x-forwarded-for": headers().get("x-forwarded-for") ?? "",
          "user-agent": headers().get("user-agent") ?? ""
        }
      }
    }
  );
}
