import { NextRequest, NextResponse } from "next/server";
import {
  assertCronAuth,
  getAdminSupabaseClient,
  requireAdminUser,
} from "@/lib/auth";
import {
  DiscoverParamsSchema,
  discoverInstagramAccounts,
} from "@/lib/instagramClient";
import { enrichWebsite } from "@/lib/enrichment";
import { scoreLead } from "@/lib/scoring";

function isCronAuthed(req: NextRequest) {
  try {
    assertCronAuth(req);
    return true;
  } catch {
    return false;
  }
}

function parseList(v: string | null) {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function runDiscovery(raw: unknown, req: NextRequest) {
  const cronOk = isCronAuthed(req);
  if (!cronOk) {
    await requireAdminUser();
  }

  const params = DiscoverParamsSchema.parse(raw ?? {});
  const supabase = getAdminSupabaseClient();

  // 1) discover candidate IG accounts using Serper/SerpApi via lib/instagramClient.ts
  const accounts = await discoverInstagramAccounts(params);

  // 2) upsert to DB (dedupe by username)
  for (const acc of accounts) {
    await supabase.from("instagram_accounts").upsert(acc, {
      onConflict: "username",
    });
  }

  // 3) fetch the inserted/updated rows back so we can enrich/score
  const usernames = accounts.map((a) => a.username);
  const { data: rows, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .in("username", usernames);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  // 4) enrich + score (same logic you already had)
  let enrichedNow = 0;

  for (const lead of rows ?? []) {
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
    const score = scoreLead({
      followers: lead.followers ?? 0,
      has_website: true,
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

    enrichedNow++;
  }

  return NextResponse.json({ ok: true, inserted: accounts.length, enrichedNow });
}

// ✅ Manual/UI uses POST with JSON body (unchanged)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return await runDiscovery(body, req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}

// ✅ Cron uses GET (Vercel cron hits via GET)
// You can also run it manually as GET if you want:
//
// /api/jobs/discover-instagram?niches=dentist,gym&locations=pakistan&limit=100&perQuery=20
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const raw = {
      niches: parseList(url.searchParams.get("niches")),
      locations: parseList(url.searchParams.get("locations")),
      intent: parseList(url.searchParams.get("intent")),
      exclude: parseList(url.searchParams.get("exclude")),
      limit: Number(url.searchParams.get("limit") ?? "100"),
      perQuery: Number(url.searchParams.get("perQuery") ?? "20"),
    };

    // If someone calls GET with no params, fall back to safe defaults:
    if (!raw.niches.length) raw.niches = ["dentist", "gym", "real estate"];

    return await runDiscovery(raw, req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}
