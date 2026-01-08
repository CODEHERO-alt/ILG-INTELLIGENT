import { NextRequest, NextResponse } from "next/server";

function hasSupabaseSession(req: NextRequest) {
  const cookies = req.cookies.getAll();

  for (const c of cookies) {
    const name = c.name;

    // legacy tokens
    if (name === "sb-access-token" || name === "sb-refresh-token") return true;

    // modern cookie format from Supabase SSR
    if (/^sb-.*-auth-token$/.test(name)) {
      return Boolean(c.value && c.value.length > 10);
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
