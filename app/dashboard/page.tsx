import { redirect } from "next/navigation";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";
import LeadTable from "@/components/lead-table";

export const dynamic = "force-dynamic";

function SetupNotice({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#070A12] text-slate-100">
      {/* Subtle premium background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(99,102,241,0.20),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_10%_20%,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_90%_30%,rgba(244,63,94,0.10),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
            <span className="h-2 w-2 rounded-full bg-amber-400/90" />
            Setup required
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Dashboard setup required
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Your app is deployed, but the Supabase database schema is not initialized yet.
            Once you run the SQL schema, this page will load your lead pipeline.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Main panel */}
          <section className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            <h2 className="text-base font-semibold text-white">Detected issue</h2>

            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="text-xs font-medium tracking-wide text-amber-200">
                SUPABASE ERROR
              </div>
              <div className="mt-2 break-words font-mono text-xs leading-5 text-amber-100/90">
                {message}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-100">Fix</div>
              <ol className="mt-3 space-y-2 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200">
                    1
                  </span>
                  <span>
                    Go to <span className="font-mono text-slate-100">Supabase → SQL Editor</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200">
                    2
                  </span>
                  <span>
                    Run the schema SQL for{" "}
                    <span className="font-mono text-slate-100">admin_users</span> and{" "}
                    <span className="font-mono text-slate-100">instagram_accounts</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200">
                    3
                  </span>
                  <span>Refresh this page</span>
                </li>
              </ol>
            </div>
          </section>

          {/* Sidebar tips */}
          <aside className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur">
            <h3 className="text-sm font-semibold text-white">What you should see after setup</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                Search + filters will work instantly
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                Leads sorted by quality score
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                Status updates per lead (new, contacted, etc.)
              </li>
            </ul>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-xs font-medium text-slate-200">Tip</div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                If you already ran the SQL, double-check you’re connected to the correct
                Supabase project and that the tables exist in the <span className="font-mono">public</span> schema.
              </p>
            </div>
          </aside>
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
    <main className="min-h-screen bg-[#070A12] text-slate-100">
      {/* Premium dark background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(99,102,241,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_10%_20%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_90%_30%,rgba(244,63,94,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_35%,rgba(0,0,0,0.25))]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
              Live dashboard
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Instagram Lead Engine
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Search, filter, and prioritize leads by quality score — fast and clean.
            </p>
          </div>

          {/* Right-side badge */}
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 shadow-[0_10px_25px_rgba(0,0,0,0.25)] backdrop-blur">
              <div className="font-medium text-slate-100">Tip</div>
              <div className="text-slate-300">Use filters to narrow to “high intent”.</div>
            </div>
          </div>
        </div>

        {/* Main table container */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_10px_35px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="text-sm font-semibold text-white">Leads</div>
            <div className="text-xs text-slate-300">
              Sorted by <span className="text-slate-100">quality score</span>
            </div>
          </div>

          {/* LeadTable likely contains its own inputs + table; this wrapper makes it premium + consistent */}
          <div className="p-4">
            <LeadTable leads={data || []} />
          </div>
        </section>

        <footer className="mt-8 text-xs text-slate-400">
          <span className="text-slate-300">High-contrast theme</span> · dark glass UI · consistent palette
        </footer>
      </div>
    </main>
  );
}
