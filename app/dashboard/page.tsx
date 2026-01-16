import { redirect } from "next/navigation";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";
import LeadTable from "@/components/lead-table";
import ExportLeadsButton from "@/components/export-leads-button";
import DiscoveryPanel from "@/components/discovery-panel";

export const dynamic = "force-dynamic";

/**
 * Microsoft-ish Fluent styling (Mica/Acrylic-inspired)
 * - High contrast dark surfaces
 * - Subtle blue accents
 * - Thin borders + soft shadows
 * - No "generic SaaS glow"; more restrained, product-y
 */

function SetupNotice({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#0B0F17] text-slate-100">
      {/* Fluent-like Mica background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_25%_10%,rgba(0,120,212,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_80%_20%,rgba(88,101,242,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_90%,rgba(34,197,94,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_30%,rgba(0,0,0,0.40))]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        <div className="mb-7 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Setup required
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Dashboard
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
          <h1 className="text-xl font-semibold tracking-tight">
            Dashboard setup required
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Your app is deployed, but the Supabase database schema is not initialized yet.
          </p>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs font-semibold text-slate-200">Error</div>
            <div className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-300">
              {message}
            </div>
          </div>

          <div className="mt-5 text-sm text-slate-200">
            <div className="font-semibold">Fix</div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-300">
              <li>Open Supabase → SQL Editor</li>
              <li>
                Run the migration in{" "}
                <code className="text-slate-100">
                  supabase/migrations/01_init_instagram_lead_engine.sql
                </code>
              </li>
              <li>Refresh this page</li>
            </ol>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://supabase.com/docs/guides/database"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"
            >
              Supabase DB docs
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/5"
            >
              Back to site
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export default async function DashboardPage() {
  try {
    await requireAdminUser();
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED") redirect("/login?next=%2Fdashboard");
    if (e?.message === "FORBIDDEN")
      redirect("/login?next=%2Fdashboard&error=forbidden");
    throw e;
  }

  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("quality_score", { ascending: false });

  if (error) {
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
    <main className="min-h-screen bg-[#0B0F17] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_25%_10%,rgba(0,120,212,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_80%_20%,rgba(88,101,242,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_90%,rgba(34,197,94,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_30%,rgba(0,0,0,0.40))]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* HEADER */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Leads</h1>
            <p className="mt-1 text-sm text-slate-300">
              Discover → enrich → score. Highest scores rise to the top. DM-only leads are included.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ExportLeadsButton />
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              Admin
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <DiscoveryPanel />
        <LeadTable leads={data ?? []} />
      </div>
    </main>
  );
}
