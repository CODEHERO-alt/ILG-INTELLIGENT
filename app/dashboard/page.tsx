import { redirect } from "next/navigation";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";
import LeadTable from "@/components/lead-table";

export const dynamic = "force-dynamic";

function SetupNotice({ message }: { message: string }) {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Dashboard setup required</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your app is deployed, but the Supabase database schema is not initialized yet.
        </p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-medium">Detected issue</div>
          <div className="mt-1">{message}</div>
        </div>

        <div className="mt-5 text-sm text-slate-700">
          <div className="font-medium">Fix</div>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>
              Go to <span className="font-mono">Supabase → SQL Editor</span>
            </li>
            <li>
              Run the schema SQL for <span className="font-mono">admin_users</span> and{" "}
              <span className="font-mono">instagram_accounts</span>
            </li>
            <li>Refresh this page</li>
          </ol>
        </div>
      </div>
    </main>
  );
}

export default async function DashboardPage() {
  try {
    await requireAdminUser();
  } catch (e: any) {
    const msg = e?.message ?? "unknown_error";

    if (msg === "UNAUTHENTICATED") redirect("/login?next=%2Fdashboard");
    if (msg === "FORBIDDEN") redirect("/login?next=%2Fdashboard&error=forbidden");

    throw e;
  }

  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("quality_score", { ascending: false });

  if (error) {
    // show setup notice instead of crashing if table doesn't exist yet
    const lower = (error.message || "").toLowerCase();
    const isMissingTable =
      lower.includes("could not find the table") ||
      lower.includes("schema cache") ||
      lower.includes("does not exist");

    if (isMissingTable) {
      return <SetupNotice message={error.message} />;
    }

    throw new Error(error.message);
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Instagram Lead Engine</h1>
      <LeadTable leads={data || []} />
    </main>
  );
}
