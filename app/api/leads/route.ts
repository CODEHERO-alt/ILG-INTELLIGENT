import { NextResponse } from "next/server";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";

export async function GET() {
  await requireAdminUser();
  const supabase = getAdminSupabaseClient();

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("quality_score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data });
}
