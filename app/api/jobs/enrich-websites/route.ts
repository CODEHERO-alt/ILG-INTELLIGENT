import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enrichWebsite } from "@/lib/enrichment";
import { computeQualityScore } from "@/lib/scoring";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  const batchSize = Number(process.env.WEBSITE_ENRICH_BATCH_SIZE ?? "20");

  // Select accounts needing enrichment
  const { data: accounts, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("has_website", false)
    .not("website_url", "is", null)
    .limit(batchSize);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  let processed = 0;

  for (const acct of accounts ?? []) {
    if (!acct.website_url) continue;

    const enr = await enrichWebsite(acct.website_url);
    if (!enr) {
      await supabase.from("job_logs").insert({
        job_name: "enrich-websites",
        level: "error",
        message: "fetch_failed",
        payload: { account_id: acct.id, url: acct.website_url }
      });
      continue;
    }

    const newScore = computeQualityScore({
      hasWebsite: true,
      offerKeywordsDetected: enr.offerKeywordsDetected,
      nicheKeywordsDetected: enr.nicheKeywordsDetected,
      lastPostAt: acct.last_post_at,
      followersCount: acct.followers_count,
      bookingOrCheckoutDetected: enr.bookingOrCheckoutDetected,
      websiteLooksNonCommercial: enr.websiteLooksNonCommercial
    });

    const statusUpdate =
      acct.status === "new" && newScore >= 7 ? "queued" : acct.status;

    const { error: updateError } = await supabase
      .from("instagram_accounts")
      .update({
        has_website: true,
        niche_guess: enr.inferredNiche ?? acct.niche_guess,
        quality_score: newScore,
        status: statusUpdate
      })
      .eq("id", acct.id);

    if (updateError) {
      await supabase.from("job_logs").insert({
        job_name: "enrich-websites",
        level: "error",
        message: "update_failed",
        payload: { account_id: acct.id, error: updateError }
      });
      continue;
    }

    await supabase.from("instagram_account_activity").insert({
      instagram_account_id: acct.id,
      type: "enriched",
      payload: enr
    });

    processed += 1;
  }

  return NextResponse.json({ processed });
}
