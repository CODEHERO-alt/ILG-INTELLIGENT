import { NextRequest, NextResponse } from "next/server";

function hasSupabaseSession(req: NextRequest) {
  // Supabase SSR commonly uses a cookie like: sb-<project-ref>-auth-token
  // Some setups may also include legacy sb-access-token / sb-refresh-token.
  const cookies = req.cookies.getAll();

  for (const c of cookies) {
    const name = c.name;

    if (name === "sb-access-token" || name === "sb-refresh-token") return true;

    // sb-<ref>-auth-token typically holds JSON with access_token/refresh_token
    if (/^sb-.*-auth-token$/.test(name)) {
      const v = c.value || "";
      // Quick sanity check: should look like JSON and contain "access_token"
      if (v.includes("access_token")) return true;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedPage = pathname.startsWith("/dashboard") || pathname.startsWith("/leads");
  const isProtectedApi = pathname.startsWith("/api") && !pathname.startsWith("/api/jobs");

  if (isProtectedPage) {
    if (!hasSupabaseSession(req)) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (isProtectedApi) {
    if (!hasSupabaseSession(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/leads/:path*", "/api/:path*"],
};
