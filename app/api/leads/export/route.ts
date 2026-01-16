import { NextResponse } from "next/server";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  let s =
    typeof value === "string"
      ? value
      : Array.isArray(value) || typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  // normalize newlines
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // escape quotes by doubling them
  if (s.includes('"')) s = s.replace(/"/g, '""');

  // wrap if it contains comma, quote, or newline
  if (/[",\n]/.test(s)) s = `"${s}"`;

  return s;
}

export async function GET() {
  try {
    await requireAdminUser();
    const supabase = getAdminSupabaseClient();

    // Hardcoded column order (matches your migration)
    const columns = [
      "id",
      "username",
      "followers",
      "bio",
      "website",
      "inferred_niche",
      "status",
      "quality_score",
      "website_title",
      "website_platform",
      "has_booking",
      "has_checkout",
      "offer_keywords",
      "enriched_at",
      "created_at",
      "updated_at",
    ] as const;

    // Fetch all rows in chunks so it won't break if you have lots of leads
    const pageSize = 1000;
    let from = 0;
    let all: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("instagram_accounts")
        .select(columns.join(","))
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      const rows = data ?? [];
      all = all.concat(rows);

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    const header = columns.join(",");
    const lines = all.map((row) => columns.map((c) => csvEscape(row?.[c])).join(","));
    const csv = [header, ...lines].join("\n");

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const filename = `ilg-leads-${yyyy}-${mm}-${dd}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? "unknown_error";
    const status = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
