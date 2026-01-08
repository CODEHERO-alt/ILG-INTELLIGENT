import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth, getAdminSupabaseClient } from "@/lib/auth";
import { discoverInstagramAccounts } from "@/lib/instagramClient";

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);

    const supabase = getAdminSupabaseClient();
    const accounts = await discoverInstagramAccounts();

    for (const acc of accounts) {
      await supabase.from("instagram_accounts").upsert(acc, {
        onConflict: "username",
      });
    }

    return NextResponse.json({ inserted: accounts.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
