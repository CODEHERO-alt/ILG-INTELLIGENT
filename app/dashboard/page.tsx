import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";
import LeadTable from "@/components/lead-table";

export default async function DashboardPage() {
  await requireAdminUser();
  const supabase = getAdminSupabaseClient();

  const { data } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("quality_score", { ascending: false });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Instagram Lead Engine</h1>
      <LeadTable leads={data || []} />
    </main>
  );
}
