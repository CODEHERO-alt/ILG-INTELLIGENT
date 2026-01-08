import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";

const ALLOWED_STATUSES = new Set([
  "new",
  "queued",
  "contacted",
  "loom_sent",
  "interested",
  "closed",
  "dead",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await requireAdminUser();
  const supabase = getAdminSupabaseClient();

  const body = await req.json().catch(() => ({}));

  const updates: any = {};

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.inferred_niche !== undefined) {
    updates.inferred_niche = String(body.inferred_niche);
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
