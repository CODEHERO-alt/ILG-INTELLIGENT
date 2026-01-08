"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)"));
  const value = match?.[2];

  if (!value) return undefined;
  return decodeURIComponent(value);
}

function setCookie(
  name: string,
  value: string,
  options: { maxAge?: number; path?: string } = {}
) {
  if (typeof document === "undefined") return;

  const path = options.path ?? "/";
  const maxAge = options.maxAge;

  let cookie = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=Lax; Secure`;
  if (typeof maxAge === "number") cookie += `; Max-Age=${maxAge}`;

  document.cookie = cookie;
}

function deleteCookie(name: string, options: { path?: string } = {}) {
  if (typeof document === "undefined") return;
  const path = options.path ?? "/";
  document.cookie = `${name}=; Path=${path}; Max-Age=0; SameSite=Lax; Secure`;
}

export function getBrowserSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) return null;

  return createBrowserClient(url, anon, {
    cookies: {
      get: (name: string) => getCookie(name),
      set: (name: string, value: string, options?: any) =>
        setCookie(name, value, { maxAge: options?.maxAge, path: options?.path }),
      remove: (name: string, options?: any) =>
        deleteCookie(name, { path: options?.path }),
    },
  });
}
