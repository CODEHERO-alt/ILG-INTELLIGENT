import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabaseClient, requireAdminUser } from "@/lib/auth";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Admin-only access
  await requireAdminUser();

  const supabase = getAdminSupabaseClient();

  const { data: lead, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !lead) {
    notFound();
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{lead.username}</h1>
          <p className="text-sm text-slate-500">
            Score: <span className="font-semibold">{lead.quality_score}</span> •
            Status: <span className="font-semibold">{lead.status}</span>
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm underline text-slate-600 hover:text-slate-900"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <section className="rounded-lg border p-4 space-y-2">
        <div className="text-sm">
          <span className="font-semibold">Followers:</span> {lead.followers ?? 0}
        </div>

        {lead.website ? (
          <div className="text-sm">
            <span className="font-semibold">Website:</span>{" "}
            <a
              href={lead.website}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {lead.website}
            </a>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No website on record.</div>
        )}

        {lead.bio ? (
          <div className="text-sm">
            <span className="font-semibold">Bio:</span> {lead.bio}
          </div>
        ) : null}

        {lead.inferred_niche ? (
          <div className="text-sm">
            <span className="font-semibold">Niche:</span> {lead.inferred_niche}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="font-semibold">Website Enrichment</h2>

        <div className="text-sm">
          <span className="font-semibold">Title:</span>{" "}
          {lead.website_title ?? "—"}
        </div>

        <div className="text-sm">
          <span className="font-semibold">Platform:</span>{" "}
          {lead.website_platform ?? "—"}
        </div>

        <div className="text-sm">
          <span className="font-semibold">Has booking:</span>{" "}
          {lead.has_booking ? "Yes" : "No"}
        </div>

        <div className="text-sm">
          <span className="font-semibold">Has checkout:</span>{" "}
          {lead.has_checkout ? "Yes" : "No"}
        </div>

        <div className="text-sm">
          <span className="font-semibold">Offer keywords:</span>{" "}
          {Array.isArray(lead.offer_keywords) && lead.offer_keywords.length > 0
            ? lead.offer_keywords.join(", ")
            : "—"}
        </div>

        <div className="text-xs text-slate-500">
          Enriched at: {lead.enriched_at ? new Date(lead.enriched_at).toLocaleString() : "—"}
        </div>
      </section>
    </main>
  );
}
