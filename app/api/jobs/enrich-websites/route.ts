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

    const staleDays = clampInt(process.env.ENRICH_STALE_DAYS, 7, 1, 60);
    const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("instagram_accounts")
      .select("*")
      .limit(batchSize)
      .order("enriched_at", { ascending: true, nullsFirst: true });

    if (!force) {
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
        if (!website) {
          const score = scoreLead({
            followers: lead.followers ?? 0,
            has_website: false,
          });

          await supabase
            .from("instagram_accounts")
            .update({
              quality_score: score,
              enriched_at: new Date().toISOString(),
            })
            .eq("id", lead.id);

          continue;
        }

        const info = await enrichWebsite(website);

        const hasWebsite = !!website;
        const score = scoreLead({
          followers: lead.followers ?? 0,
          has_website: hasWebsite,
          has_booking: info?.has_booking ?? false,
          has_checkout: info?.has_checkout ?? false,
          offer_keywords: info?.offer_keywords ?? [],
          has_email: !!info?.contact_email,
          has_phone: !!info?.contact_phone,
          has_whatsapp: !!info?.contact_whatsapp,
        });

        await supabase
          .from("instagram_accounts")
          .update({
            website_title: info?.website_title ?? lead.website_title ?? null,
            website_platform: info?.website_platform ?? lead.website_platform ?? null,
            has_booking: info?.has_booking ?? lead.has_booking ?? false,
            has_checkout: info?.has_checkout ?? lead.has_checkout ?? false,
            offer_keywords: info?.offer_keywords ?? lead.offer_keywords ?? null,

            contact_email: info?.contact_email ?? lead.contact_email ?? null,
            contact_phone: info?.contact_phone ?? lead.contact_phone ?? null,
            contact_whatsapp: info?.contact_whatsapp ?? lead.contact_whatsapp ?? null,

            quality_score: score,
            enriched_at: new Date().toISOString(),
          })
          .eq("id", lead.id);

        enriched++;
      } catch (e: any) {
        failures.push({
          id: lead.id,
          username: lead.username,
          reason: e?.message || "ENRICH_FAILED",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      enriched,
      failures,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}
