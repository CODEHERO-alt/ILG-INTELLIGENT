import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth, getAdminSupabaseClient } from "@/lib/auth";
import { enrichWebsite } from "@/lib/enrichment";
import { scoreLead } from "@/lib/scoring";

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

async function safeLogJobRun(
  supabase: ReturnType<typeof getAdminSupabaseClient>,
  payload: any
) {
  try {
    const { error } = await supabase.from("job_runs").insert(payload);
    if (error) {
      // ignore
    }
  } catch {
    // ignore
  }
}

async function runEnrich(req: NextRequest) {
  assertCronAuth(req);

  const supabase = getAdminSupabaseClient();

  const batchSize = clampInt(process.env.ENRICH_BATCH_SIZE, 50, 1, 200);
  const staleDays = clampInt(process.env.ENRICH_STALE_DAYS, 7, 1, 365);

  const staleIso = new Date(Date.now() - staleDays * 86400000).toISOString();

  const { data: rows, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .not("website", "is", null)
    .or(`enriched_at.is.null,enriched_at.lt.${staleIso}`)
    .limit(batchSize);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  let processed = 0;
  let enriched = 0;
  let failures = 0;

  for (const lead of rows ?? []) {
    processed++;

    const website = typeof lead.website === "string" ? lead.website.trim() : "";
    if (!website) continue;

    try {
      const info = await enrichWebsite(website);

      const score = scoreLead({
        followers: lead.followers ?? 0,
        has_website: true,
        has_booking: info?.has_booking ?? false,
        has_checkout: info?.has_checkout ?? false, // ✅ fixed
        offer_keywords: info?.offer_keywords ?? [],
        has_email: !!info?.contact_email,
        has_phone: !!info?.contact_phone,
        has_whatsapp: !!info?.contact_whatsapp,
      });

      const { error: upErr } = await supabase
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

      if (upErr) {
        failures++;
        await safeLogJobRun(supabase, {
          job: "enrich-websites",
          ok: false,
          meta: { lead_id: lead.id, reason: upErr.message },
        });
        continue;
      }

      enriched++;
    } catch (e: any) {
      failures++;
      await safeLogJobRun(supabase, {
        job: "enrich-websites",
        ok: false,
        meta: { lead_id: lead.id, reason: e?.message || "ENRICH_FAILED" },
      });
    }
  }

  return NextResponse.json({ ok: true, processed, enriched, failures });
}

export async function POST(req: NextRequest) {
  try {
    return await runEnrich(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}

export async function GET(req: NextRequest) {
  try {
    return await runEnrich(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}
