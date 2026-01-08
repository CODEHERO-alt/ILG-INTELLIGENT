import { redirect } from "next/navigation";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";
import LeadTable from "@/components/lead-table";

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
            <span className="h-1.5 w-1.5 rounded-full bg-[#0078D4]" />
            Fluent dark
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur">
          <div className="border-b border-white/10 px-6 py-5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Dashboard setup required
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Your app is deployed, but the Supabase database schema is not initialized yet.
            </p>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-5">
            <section className="lg:col-span-3">
              <div className="text-sm font-semibold text-slate-100">Detected issue</div>

              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                <div className="text-[11px] font-medium tracking-wide text-amber-200">
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

            <aside className="lg:col-span-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs font-semibold text-slate-100">After setup</div>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0078D4]" />
                    Leads load instantly
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0078D4]" />
                    Sorted by quality score
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0078D4]" />
                    Status updates per lead
                  </li>
                </ul>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-300">
                Tip: If you already ran SQL, confirm the tables exist in{" "}
                <span className="font-mono text-slate-100">public</span>.
              </div>
            </aside>
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
    <main className="min-h-screen bg-[#0B0F17] text-slate-100">
      {/* Fluent-like Mica background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_25%_10%,rgba(0,120,212,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_80%_18%,rgba(88,101,242,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_30%,rgba(0,0,0,0.40))]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Header (more Microsoft product-y, less "marketing hero") */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live dashboard
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Instagram Lead Engine
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Search, filter, and prioritize leads by quality score.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs text-slate-300 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur">
              <div className="font-semibold text-slate-100">Tip</div>
              <div>Use filters to narrow to high-intent leads.</div>
            </div>
          </div>
        </div>

        {/* Main card */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="text-sm font-semibold text-white">Leads</div>
            <div className="text-xs text-slate-300">
              Sorted by <span className="text-slate-100">quality score</span>
            </div>
          </div>

          {/* IMPORTANT:
              We are NOT touching LeadTable logic.
              We are re-skinning its internal inputs/table using child selectors.
           */}
          <div
            className={[
              "p-4",
              // Inputs / selects: remove white + make Fluent dark
              "[&_input]:bg-[#0E1624] [&_input]:text-slate-100 [&_input]:placeholder:text-slate-500",
              "[&_input]:border [&_input]:border-white/10 [&_input]:rounded-lg [&_input]:shadow-none",
              "[&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-[#0078D4]/35 [&_input]:focus:border-[#0078D4]/40",
              // Selects (and option readability)
              "[&_select]:bg-[#0E1624] [&_select]:text-slate-100 [&_select]:border [&_select]:border-white/10 [&_select]:rounded-lg",
              "[&_select]:focus:outline-none [&_select]:focus:ring-2 [&_select]:focus:ring-[#0078D4]/35 [&_select]:focus:border-[#0078D4]/40",
              "[&_option]:bg-[#0E1624] [&_option]:text-slate-100",
              // Buttons: dark + Microsoft blue accent
              "[&_button]:border-white/15 [&_button]:bg-white/[0.04] [&_button]:text-slate-100 [&_button]:rounded-lg",
              "[&_button]:hover:bg-white/[0.07] [&_button]:transition-colors",
              "[&_button]:focus:outline-none [&_button]:focus:ring-2 [&_button]:focus:ring-[#0078D4]/35",
              // Table surface: remove white table header/rows look
              "[&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0",
              "[&_thead]:bg-transparent",
              "[&_th]:bg-[#0E1624] [&_th]:text-slate-200 [&_th]:border-b [&_th]:border-white/10 [&_th]:font-medium",
              "[&_th:first-child]:rounded-tl-xl [&_th:last-child]:rounded-tr-xl",
              "[&_td]:bg-[#0B1220] [&_td]:text-slate-100 [&_td]:border-b [&_td]:border-white/10",
              "[&_tr:hover_td]:bg-[#0C1526]",
              // Links: Microsoft-ish blue
              "[&_a]:text-[#4CB2FF] [&_a:hover]:text-[#7CCBFF] [&_a]:underline/30 [&_a:hover]:underline",
              // Subtle rounding if LeadTable wraps in a border box
              "[&_*]:selection:bg-[#0078D4]/30 [&_*]:selection:text-white",
            ].join(" ")}
          >
            <LeadTable leads={data || []} />
          </div>

          {/* Bottom edge like Fluent panels */}
          <div className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">
            Fluent dark · Mica-inspired surface · accent{" "}
            <span className="text-slate-200">#0078D4</span>
          </div>
        </section>
      </div>
    </main>
  );
}
