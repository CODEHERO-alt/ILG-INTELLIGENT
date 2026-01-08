import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function escapeLike(input: string) {
  // escape % and _ for LIKE queries
  return input.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = getAdminSupabaseClient();

    const url = new URL(req.url);
    const page = clampInt(url.searchParams.get("page"), 1, 1, 10_000);
    const pageSize = clampInt(url.searchParams.get("pageSize"), 25, 1, 100);

    const status = (url.searchParams.get("status") || "").trim();
    const minScore = url.searchParams.get("minScore");
    const maxScore = url.searchParams.get("maxScore");
    const search = (url.searchParams.get("search") || "").trim();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("instagram_accounts")
      .select("*", { count: "exact" })
      .order("quality_score", { ascending: false })
      .range(from, to);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (minScore !== null && minScore !== "") {
      const n = clampInt(minScore, 0, 0, 10);
      query = query.gte("quality_score", n);
    }

    if (maxScore !== null && maxScore !== "") {
      const n = clampInt(maxScore, 10, 0, 10);
      query = query.lte("quality_score", n);
    }

    if (search) {
      const s = escapeLike(search.toLowerCase());
      // Use ILIKE with escaped pattern; Supabase supports ilike() but not explicit ESCAPE.
      // Escaping still reduces wildcard abuse when input contains %/_.
      const pattern = `%${s}%`;
      query = query.or(
        [
          `username.ilike.${pattern}`,
          `bio.ilike.${pattern}`,
          `website.ilike.${pattern}`,
          `inferred_niche.ilike.${pattern}`,
          `website_title.ilike.${pattern}`,
          `website_platform.ilike.${pattern}`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (e: any) {
    const msg = e?.message ?? "unknown_error";
    const status = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
