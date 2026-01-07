import { requireAdminUser } from "@/lib/auth";
import { LeadTable } from "@/components/lead-table";

export const metadata = {
  title: "Dashboard – Instagram Lead Engine",
  description:
    "Review, filter, and action Instagram leads for the 7-Day Website Revenue Sprint."
};

export default async function DashboardPage() {
  // Protect this page – only logged-in Supabase admin
  await requireAdminUser();

  return (
    <main className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Instagram Lead Engine
          </h1>
          <p className="text-sm text-slate-400">
            New leads → scored → queued. You review, DM, send Loom, and close.
          </p>
        </div>
      </header>

      {/* Lead table with filters + actions */}
      <section>
        <LeadTable />
      </section>
    </main>
  );
}
