import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const status = searchParams.getAll("status");
  const minScore = searchParams.get("minScore");
  const maxScore = searchParams.get("maxScore");
  const niche = searchParams.get("niche");
  const search = searchParams.get("search");
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("instagram_accounts")
    .select("*", { count: "exact" });

  if (status.length > 0) {
    query = query.in("status", status);
  }

  if (minScore) {
    query = query.gte("quality_score", Number(minScore));
  }

  if (maxScore) {
    query = query.lte("quality_score", Number(maxScore));
  }

  if (niche) {
    query = query.ilike("niche_guess", `%${niche}%`);
  }

  if (search) {
    query = query.or(
      `username.ilike.%${search}%,full_name.ilike.%${search}%`
    );
  }

  query = query.order("quality_score", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({
    leads: data,
    pagination: {
      total: count ?? 0,
      page,
      pageSize
    }
  });
}
