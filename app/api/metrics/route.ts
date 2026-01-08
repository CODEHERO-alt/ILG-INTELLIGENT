import { NextResponse } from "next/server";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";

export async function GET() {
  await requireAdminUser();
  const supabase = getAdminSupabaseClient();

  const { count: total } = await supabase
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true });

  const { count: hot } = await supabase
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true })
    .gte("quality_score", 7);

  return NextResponse.json({
    total: total ?? 0,
    hot: hot ?? 0,
  });
}
