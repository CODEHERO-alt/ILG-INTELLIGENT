import { redirect } from "next/navigation";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";
import LeadTable from "@/components/lead-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    await requireAdminUser();
  } catch (e: any) {
    const msg = e?.message ?? "unknown_error";

    // Not logged in → go to login
    if (msg === "UNAUTHENTICATED") {
      redirect("/login?next=%2Fdashboard");
    }

    // Logged in but not an admin → go to login with a friendly error flag
    if (msg === "FORBIDDEN") {
      redirect("/login?next=%2Fdashboard&error=forbidden");
    }

    // Other issues (missing env vars, DB error, etc.) → show real server error
    throw e;
  }

  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("quality_score", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Instagram Lead Engine</h1>
      <LeadTable leads={data || []} />
    </main>
  );
}
