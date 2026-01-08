import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth, getAdminSupabaseClient } from "@/lib/auth";
import { enrichWebsite } from "@/lib/enrichment";
import { scoreLead } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);
    const supabase = getAdminSupabaseClient();

    const { data: leads } = await supabase
      .from("instagram_accounts")
      .select("*")
      .is("enriched_at", null)
      .limit(25);

    for (const lead of leads || []) {
      if (!lead.website) continue;

      const enrichment = await enrichWebsite(lead.website);
      if (!enrichment) continue;

      const score = scoreLead({
        followers: lead.followers,
        has_booking: enrichment.has_booking,
        has_checkout: enrichment.has_checkout,
        offer_keywords: enrichment.offer_keywords,
      });

      await supabase
        .from("instagram_accounts")
        .update({
          ...enrichment,
          quality_score: score,
          enriched_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
    }

    return NextResponse.json({ enriched: leads?.length ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
