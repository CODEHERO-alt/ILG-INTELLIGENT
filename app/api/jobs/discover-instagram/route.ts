import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth, getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";
import { DiscoverParamsSchema, discoverInstagramAccounts } from "@/lib/instagramClient";
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

export async function POST(req: NextRequest) {
  try {
    const cronOk = isCronAuthed(req);
    if (!cronOk) {
      await requireAdminUser();
    }

    const body = await req.json().catch(() => ({}));
    const params = DiscoverParamsSchema.parse(body);

    const supabase = getAdminSupabaseClient();
    const accounts = await discoverInstagramAccounts(params);

    for (const acc of accounts) {
      await supabase.from("instagram_accounts").upsert(acc, {
        onConflict: "username",
      });
    }

    const usernames = accounts.map((a) => a.username);
    const { data: rows, error } = await supabase
      .from("instagram_accounts")
      .select("*")
      .in("username", usernames);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}
