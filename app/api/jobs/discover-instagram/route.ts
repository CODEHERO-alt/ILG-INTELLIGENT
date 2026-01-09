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
import { discoverContactsForUsername } from "@/lib/contactDiscovery";

function isCron(req: NextRequest) {
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

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

async function run(req: NextRequest, raw: any) {
  // ✅ Allow either cron OR logged-in admin
  if (!isCron(req)) {
    await requireAdminUser();
  }

  const params = DiscoverParamsSchema.parse(raw ?? {});
  const supabase = getAdminSupabaseClient();

  // 1) Discover candidates from web search
  const accounts = await discoverInstagramAccounts(params);

  // 2) Upsert by username (dedupe)
  if (accounts.length) {
    const { error } = await supabase.from("instagram_accounts").upsert(accounts, {
      onConflict: "username",
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
  }

  // 3) Fetch rows back for enrichment/scoring
  const usernames = accounts.map((a) => a.username);
  const { data: rows, error: fetchErr } = await supabase
    .from("instagram_accounts")
    .select("*")
    .in("username", usernames.length ? usernames : ["__none__"]);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 400 });
  }

  let enrichedNow = 0;
  let contactPassNow = 0;

  // 4) Enrich + score all leads (with and without websites)
  for (const lead of rows ?? []) {
    const existingWebsite = typeof lead.website === "string" ? lead.website.trim() : "";

    // If there is no website, try a lightweight web pass to find contact signals / bio-link
    let contactEmail: string | null = lead.contact_email ?? null;
    let contactPhone: string | null = lead.contact_phone ?? null;
    let contactWhatsApp: string | null = lead.contact_whatsapp ?? null;
    let bioLink: string | null = null;

    if (!existingWebsite) {
      try {
        const contact = await discoverContactsForUsername(lead.username, {
          maxQueries: clampInt(raw?.contactMaxQueries, 2, 1, 5),
          resultsPerQuery: clampInt(raw?.contactResultsPerQuery, 5, 3, 10),
        });

        contactEmail = contactEmail ?? contact.contact_email ?? null;
        contactPhone = contactPhone ?? contact.contact_phone ?? null;
        contactWhatsApp = contactWhatsApp ?? contact.contact_whatsapp ?? null;
        bioLink = contact.bio_link ?? null;

        if (contact.contact_email || contact.contact_phone || contact.contact_whatsapp || contact.bio_link) {
          contactPassNow++;
        }
      } catch {
        // ignore contact discovery errors; still score with what we have
      }
    }

    // If we found a bio-link (linktree/beacons/etc), treat it as a website for enrichment.
    const website = existingWebsite || (typeof bioLink === "string" ? bioLink.trim() : "");

    // Enrichment is only performed when we actually have a website URL.
    if (!website) {
      const score = scoreLead({
        followers: lead.followers ?? 0,
        has_website: false,
        has_email: !!contactEmail,
        has_phone: !!contactPhone,
        has_whatsapp: !!contactWhatsApp,
        has_booking: false,
        has_checkout: false,
        offer_keywords: [],
      });

      const { error: upErr } = await supabase
        .from("instagram_accounts")
        .update({
          contact_email: contactEmail,
          contact_phone: contactPhone,
          contact_whatsapp: contactWhatsApp,
          quality_score: score,
        })
        .eq("id", lead.id);

      if (upErr) {
        // keep going; one bad row shouldn't fail the whole job
        continue;
      }

      continue;
    }

    // Website enrichment (includes contact extraction + offer signals)
    const info = await enrichWebsite(website);

    const score = scoreLead({
      followers: lead.followers ?? 0,
      has_website: true,
      has_booking: info?.has_booking ?? false,
      has_checkout: info?.has_checkout ?? false,
      offer_keywords: info?.offer_keywords ?? [],
      has_email: !!(info?.contact_email ?? contactEmail),
      has_phone: !!(info?.contact_phone ?? contactPhone),
      has_whatsapp: !!(info?.contact_whatsapp ?? contactWhatsApp),
    });

    const { error: upErr } = await supabase
      .from("instagram_accounts")
      .update({
        // if we discovered a bio-link, store it in website so future runs can enrich without re-discovery
        website: website || lead.website || null,

        website_title: info?.website_title ?? lead.website_title ?? null,
        website_platform: info?.website_platform ?? lead.website_platform ?? null,
        has_booking: info?.has_booking ?? lead.has_booking ?? false,
        has_checkout: info?.has_checkout ?? lead.has_checkout ?? false,
        offer_keywords: info?.offer_keywords ?? lead.offer_keywords ?? null,

        contact_email: info?.contact_email ?? contactEmail ?? lead.contact_email ?? null,
        contact_phone: info?.contact_phone ?? contactPhone ?? lead.contact_phone ?? null,
        contact_whatsapp: info?.contact_whatsapp ?? contactWhatsApp ?? lead.contact_whatsapp ?? null,

        quality_score: score,
        enriched_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (upErr) continue;

    enrichedNow++;
  }

  return NextResponse.json({
    ok: true,
    queries:
      params.niches.length *
      Math.max(1, params.locations.length) *
      Math.max(1, params.intent.length),
    discovered: accounts.length,
    insertedOrUpdated: accounts.length,
    enrichedNow,
    contactPassNow,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return await run(req, body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 400 });
  }
}

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

      // optional tuning for contact discovery (second pass)
      contactMaxQueries: Number(url.searchParams.get("contactMaxQueries") ?? "2"),
      contactResultsPerQuery: Number(url.searchParams.get("contactResultsPerQuery") ?? "5"),
    };

    if (!raw.niches.length) raw.niches = ["dentist"]; // safe default
    return await run(req, raw);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 400 });
  }
}
