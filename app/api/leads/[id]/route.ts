import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";

const updateSchema = z.object({
  status: z
    .enum([
      "new",
      "queued",
      "contacted",
      "loom_sent",
      "interested",
      "closed",
      "dead"
    ])
    .optional(),
  reason_dead: z.string().nullable().optional(),
  niche_guess: z.string().nullable().optional()
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: activity } = await supabase
    .from("instagram_account_activity")
    .select("*")
    .eq("instagram_account_id", params.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ lead: data, activity: activity ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAdminUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const fields: Record<string, unknown> = {};
  if (parsed.data.status) {
    fields.status = parsed.data.status;
    fields.last_status_change_at = new Date().toISOString();
  }
  if (parsed.data.reason_dead !== undefined) {
    fields.reason_dead = parsed.data.reason_dead;
  }
  if (parsed.data.niche_guess !== undefined) {
    fields.niche_guess = parsed.data.niche_guess;
  }

  const { data, error } = await supabase
    .from("instagram_accounts")
    .update(fields)
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // Log activity
  await supabase.from("instagram_account_activity").insert({
    instagram_account_id: params.id,
    type: "status_changed",
    payload: {
      updated_by: user.id,
      fields
    }
  });

  return NextResponse.json({ lead: data });
}
