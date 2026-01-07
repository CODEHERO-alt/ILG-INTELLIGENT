import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { DMTemplateButton } from "@/components/dm-template-button";
import { getAuthUser } from "@/lib/auth";

async function fetchLead(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const { data: activity } = await supabase
    .from("instagram_account_activity")
    .select("*")
    .eq("instagram_account_id", id)
    .order("created_at", { ascending: false });

  return { lead: data, activity: activity ?? [] };
}

export default async function LeadDetailPage({
  params
}: {
  params: { id: string };
}) {
  const user = await getAuthUser();
  if (!user) {
    // middleware should handle, but just in case
    notFound();
  }

  const data = await fetchLead(params.id);
  if (!data) notFound();

  const { lead, activity } = data;

  return (
    <main className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            @{lead.username}
            <StatusBadge status={lead.status} />
          </h1>
          {lead.full_name && (
            <p className="text-sm text-slate-300">{lead.full_name}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Niche: {lead.niche_guess ?? "Unknown"} • Score:{" "}
            <span className="font-semibold">{lead.quality_score}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`https://instagram.com/${lead.username}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-md text-xs border border-slate-700 hover:bg-slate-800"
          >
            Open Instagram
          </a>
          {lead.website_url && (
            <a
              href={lead.website_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-md text-xs border border-slate-700 hover:bg-slate-800"
            >
              Open Website
            </a>
          )}
          <DMTemplateButton
            username={lead.username}
            nicheGuess={lead.niche_guess}
          />
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60">
            <h2 className="text-sm font-semibold mb-2">Bio</h2>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">
              {lead.bio ?? "No bio available."}
            </p>
          </div>

          <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60">
            <h2 className="text-sm font-semibold mb-3">Activity</h2>
            {activity.length === 0 ? (
              <p className="text-xs text-slate-400">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {activity.map((a: any) => (
                  <li
                    key={a.id}
                    className="border border-slate-800 rounded-lg px-3 py-2 bg-slate-950/60"
                  >
                    <p className="font-medium text-slate-200">{a.type}</p>
                    <p className="text-slate-400">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                    {a.payload && (
                      <pre className="mt-1 text-[10px] text-slate-400 whitespace-pre-wrap">
                        {JSON.stringify(a.payload, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <form
            action={async (formData) => {
              "use server";
              const supabase = createSupabaseServerClient();
              const status = formData.get("status") as string;
              const reason_dead =
                (formData.get("reason_dead") as string) || null;

              await supabase
                .from("instagram_accounts")
                .update({
                  status,
                  reason_dead,
                  last_status_change_at: new Date().toISOString()
                })
                .eq("id", lead.id);

              await supabase.from("instagram_account_activity").insert({
                instagram_account_id: lead.id,
                type: "status_changed",
                payload: { status, reason_dead }
              });
            }}
            className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-3"
          >
            <h2 className="text-sm font-semibold mb-1">Status & Notes</h2>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Status</label>
              <select
                name="status"
                defaultValue={lead.status}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
              >
                <option value="new">new</option>
                <option value="queued">queued</option>
                <option value="contacted">contacted</option>
                <option value="loom_sent">loom_sent</option>
                <option value="interested">interested</option>
                <option value="closed">closed</option>
                <option value="dead">dead</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Status is applied when you submit the form.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">
                Reason (if dead)
              </label>
              <input
                name="reason_dead"
                defaultValue={lead.reason_dead ?? ""}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-xs font-medium"
            >
              Save status
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
