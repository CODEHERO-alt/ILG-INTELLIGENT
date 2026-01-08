import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await requireAdminUser();
  const supabase = getAdminSupabaseClient();
  const body = await req.json();

  const allowed = ["status", "inferred_niche"];
  const updates: any = {};

  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { error } = await supabase
    .from("instagram_accounts")
    .update(updates)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
