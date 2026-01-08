import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth, getAdminSupabaseClient } from "@/lib/auth";
import { enrichWebsite } from "@/lib/enrichment";
import { scoreLead } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);

    const supabase = getAdminSupabaseClient();
    const batchSize = Math.min(
      Math.max(Number(process.env.ENRICH_BATCH_SIZE ?? 25), 1),
      100
    );

    const { data: leads, error } = await supabase
      .from("instagram_accounts")
      .select("*")
      .is("enriched_at", null)
      .limit(batchSize);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let processed = 0;
    let enriched = 0;
    const failures: Array<{ id: string; reason: string }> = [];

    for (const lead of leads ?? []) {
      processed++;

      try {
        if (!lead.website || typeof lead.website !== "string") continue;

        const enrichment = await enrichWebsite(lead.website);
        if (!enrichment) continue;

        const score = scoreLead({
          followers: lead.followers ?? 0,
          has_booking: enrichment.has_booking,
          has_checkout: enrichment.has_checkout,
          offer_keywords: enrichment.offer_keywords ?? [],
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
          failures.push({ id: lead.id, reason: updErr.message });
          continue;
        }

        enriched++;
      } catch (e: any) {
        failures.push({ id: lead.id, reason: e?.message ?? "unknown_error" });
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      enriched,
      failures,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
