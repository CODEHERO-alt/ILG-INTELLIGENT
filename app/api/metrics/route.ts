import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs"; // ensure Node runtime (not Edge)

export async function GET(_req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Total leads
  const { count: totalCount, error: totalError } = await supabase
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true });

  if (totalError) {
    console.error(totalError);
    return NextResponse.json({ error: "db_error_total" }, { status: 500 });
  }

  // Leads by status (PostgREST will group by status when using aggregate)
  const { data: byStatus, error: byStatusError } = await supabase
    .from("instagram_accounts")
    .select("status, count:id");

  if (byStatusError) {
    console.error(byStatusError);
    return NextResponse.json({ error: "db_error_by_status" }, { status: 500 });
  }

  // Discovered in last 7 days
  const { count: discoveredLast7, error: discError } = await supabase
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", last7.toISOString());

  if (discError) {
    console.error(discError);
    return NextResponse.json(
      { error: "db_error_discovered_7" },
      { status: 500 }
    );
  }

  // Contacted in last 7 days
  const { count: contactedLast7, error: contactedError } = await supabase
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true })
    .eq("status", "contacted")
    .gte("last_status_change_at", last7.toISOString());

  if (contactedError) {
    console.error(contactedError);
    return NextResponse.json(
      { error: "db_error_contacted_7" },
      { status: 500 }
    );
  }

  // Interested in last 7 days
  const { count: interestedLast7, error: interestedError } = await supabase
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true })
    .eq("status", "interested")
    .gte("last_status_change_at", last7.toISOString());

  if (interestedError) {
    console.error(interestedError);
    return NextResponse.json(
      { error: "db_error_interested_7" },
      { status: 500 }
    );
  }

  // Closed in last 30 days
  const { count: closedLast30, error: closedError } = await supabase
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true })
    .eq("status", "closed")
    .gte("last_status_change_at", last30.toISOString());

  if (closedError) {
    console.error(closedError);
    return NextResponse.json(
      { error: "db_error_closed_30" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    total_leads: totalCount ?? 0,
    leads_by_status: (byStatus ?? []).map((row: any) => ({
      status: row.status,
      count: row.count as number
    })),
    leads_discovered_last_7_days: discoveredLast7 ?? 0,
    leads_contacted_last_7_days: contactedLast7 ?? 0,
    leads_interested_last_7_days: interestedLast7 ?? 0,
    leads_closed_last_30_days: closedLast30 ?? 0
  });
}
