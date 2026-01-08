import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth, getAdminSupabaseClient } from "@/lib/auth";
import { enrichWebsite } from "@/lib/enrichment";
import { scoreLead } from "@/lib/scoring";

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);

    const supabase = getAdminSupabaseClient();
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const batchSize = clampInt(process.env.ENRICH_BATCH_SIZE, 25, 1, 100);

    // Optional: only re-enrich after N days unless force=true
    const staleDays = clampInt(process.env.ENRICH_STALE_DAYS, 7, 1, 60);
    const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("instagram_accounts")
      .select("*")
      .limit(batchSize);

    if (!force) {
      // Prefer never enriched OR stale enriched
      // We'll fetch ones that are null first by ordering; keep it simple and predictable:
      query = query.or(`enriched_at.is.null,enriched_at.lt.${staleBefore}`);
    }

    const { data: leads, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    let processed = 0;
    let enriched = 0;
    const failures: Array<{ id: string; username?: string; reason: string }> = [];

    for (const lead of leads ?? []) {
      processed++;

      try {
        const website = typeof lead.website === "string" ? lead.website.trim() : "";
        if (!website) continue;

        const enrichment = await enrichWebsite(website);
        if (!enrichment) continue;

        const score = scoreLead({
          followers: Number(lead.followers ?? 0),
          has_booking: Boolean(enrichment.has_booking),
          has_checkout: Boolean(enrichment.has_checkout),
          offer_keywords: Array.isArray(enrichment.offer_keywords) ? enrichment.offer_keywords : [],
        });

        const { error: updErr } = await supabase
          .from("instagram_accounts")
          .update({
            ...enrichment,
            quality_score: score,
            enriched_at: new Date().toISOString(),
          })
          .eq("id", lead.id);

        if (updErr) {
          failures.push({ id: lead.id, username: lead.username, reason: updErr.message });
          continue;
        }

        enriched++;
      } catch (e: any) {
        failures.push({
          id: lead.id,
          username: lead.username,
          reason: e?.message ?? "unknown_error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      batchSize,
      force,
      processed,
      enriched,
      failuresCount: failures.length,
      failures,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}
