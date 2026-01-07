import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  discoverFromHashtags,
  discoverFromSeedAccounts
} from "@/lib/instagramClient";
import { computeQualityScore, LeadSignals } from "@/lib/scoring";

export const runtime = "nodejs"; // allow puppeteer/playwright when plugged in

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  const hashtags =
    process.env.IG_TARGET_HASHTAGS?.split(",").map((h) => h.trim()) ?? [];
  const seeds =
    process.env.IG_SEED_USERNAMES?.split(",").map((u) => u.trim()) ?? [];

  const limitPerSource = Number(process.env.IG_DISCOVERY_BATCH_SIZE ?? "20");

  try {
    const [fromTags, fromSeeds] = await Promise.all([
      hashtags.length
        ? discoverFromHashtags({
            hashtags,
            limitPerHashtag: limitPerSource
          })
        : [],
      seeds.length
        ? discoverFromSeedAccounts({
            usernames: seeds,
            limitPerSeed: limitPerSource
          })
        : []
    ]);

    const combined = [...fromTags, ...fromSeeds];

    for (const acct of combined) {
      const signals: LeadSignals = {
        hasWebsite: !!acct.website_url,
        offerKeywordsDetected: false, // filled later by enrichment
        nicheKeywordsDetected: false,
        lastPostAt: acct.last_post_at ?? null,
        followersCount: acct.followers_count ?? null,
        bookingOrCheckoutDetected: false,
        websiteLooksNonCommercial: false
      };

      const score = computeQualityScore(signals);

      const { data, error } = await supabase
        .from("instagram_accounts")
        .upsert(
          {
            username: acct.username,
            full_name: acct.full_name ?? null,
            bio: acct.bio ?? null,
            website_url: acct.website_url ?? null,
            followers_count: acct.followers_count ?? null,
            following_count: acct.following_count ?? null,
            is_business: acct.is_business ?? null,
            last_post_at: acct.last_post_at ?? null,
            source_tag: acct.source_tag ?? null,
            has_website: !!acct.website_url,
            quality_score: score,
            status: score >= 7 ? "queued" : "new"
          },
          { onConflict: "username" }
        )
        .select("*")
        .maybeSingle();

      if (error) {
        await supabase.from("job_logs").insert({
          job_name: "discover-instagram",
          level: "error",
          message: "upsert_failed",
          payload: { error, acct }
        });
        continue;
      }

      if (data) {
        await supabase.from("instagram_account_activity").insert({
          instagram_account_id: data.id,
          type: "discovered",
          payload: { source_tag: acct.source_tag, initial_score: score }
        });
      }
    }

    return NextResponse.json({ processed: combined.length });
  } catch (err) {
    await supabase.from("job_logs").insert({
      job_name: "discover-instagram",
      level: "error",
      message: "job_failed",
      payload: { error: String(err) }
    });

    return NextResponse.json({ error: "job_failed" }, { status: 500 });
  }
}
