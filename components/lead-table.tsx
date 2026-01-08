"use client";

import { useMemo, useState } from "react";
import LeadFilters, { LeadFiltersState } from "./lead-filters";

const STATUSES = [
  "new",
  "queued",
  "contacted",
  "loom_sent",
  "interested",
  "closed",
  "dead",
];

function prettyStatus(s: string) {
  return s.replace(/_/g, " ");
}

function scoreBadge(score: number) {
  if (score >= 9) return "🔥 Elite";
  if (score >= 7) return "✅ Strong";
  if (score >= 5) return "⚠️ Medium";
  return "🧊 Low";
}

export default function LeadTable({ leads }: { leads: any[] }) {
  // IMPORTANT: default minScore is empty => show ALL leads by default
  const [filters, setFilters] = useState<LeadFiltersState>({
    search: "",
    status: "all",
    minScore: "",
    maxScore: "",
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const minScore = filters.minScore ? Number(filters.minScore) : 0;
    const maxScore = filters.maxScore ? Number(filters.maxScore) : null;

    return (leads || [])
      .filter((l) => {
        const effectiveStatus = localStatus[l.id] ?? l.status ?? "new";

        if (filters.status !== "all" && effectiveStatus !== filters.status) return false;

        const score = l.quality_score ?? 0;
        if (score < minScore) return false;
        if (maxScore !== null && Number.isFinite(maxScore) && score > maxScore) return false;

        if (!q) return true;

        const hay = [
          l.username,
          l.bio,
          l.website,
          l.inferred_niche,
          l.website_title,
          l.website_platform,
          l.contact_email,
          l.contact_phone,
          l.contact_whatsapp,
          Array.isArray(l.offer_keywords) ? l.offer_keywords.join(" ") : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      // Always give top spot to highest scoring leads
      .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
  }, [leads, filters, localStatus]);

  const stats = useMemo(() => {
    const total = leads?.length ?? 0;
    const strong = (leads || []).filter((l) => (l.quality_score ?? 0) >= 7).length;
    const avg =
      total === 0
        ? 0
        : Math.round(((leads || []).reduce((sum, l) => sum + (l.quality_score ?? 0), 0) / total) * 10) / 10;

    return { total, strong, avg };
  }, [leads]);

  async function updateStatus(id: string, nextStatus: string) {
    try {
      setSavingId(id);
      setLocalStatus((prev) => ({ ...prev, [id]: nextStatus }));

      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        // rollback local UI on failure
        setLocalStatus((prev) => {
          const { [id]: _, ...rest } = prev;
          return rest;
        });
        alert("Failed to update status.");
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Lead table</div>
          <div className="mt-1 text-xs text-white/55">
            Total: <span className="text-white/80">{stats.total}</span> • Strong (7+):{" "}
            <span className="text-white/80">{stats.strong}</span> • Avg score:{" "}
            <span className="text-white/80">{stats.avg}</span>
          </div>
        </div>

        {/* Your repo's LeadFilters does NOT accept `value` prop.
            It accepts `onChange` and optional `defaultMinScore`. */}
        <LeadFilters onChange={(next) => setFilters(next)} defaultMinScore="" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-white/[0.04]">
              <th className="text-left px-4 py-3 border-b border-white/10 text-[11px] uppercase tracking-wider text-white/55">
                Lead
              </th>
              <th className="text-left px-4 py-3 border-b border-white/10 text-[11px] uppercase tracking-wider text-white/55">
                Score
              </th>
              <th className="text-left px-4 py-3 border-b border-white/10 text-[11px] uppercase tracking-wider text-white/55">
                Status
              </th>
              <th className="text-left px-4 py-3 border-b border-white/10 text-[11px] uppercase tracking-wider text-white/55">
                Contact
              </th>
              <th className="text-right px-4 py-3 border-b border-white/10 text-[11px] uppercase tracking-wider text-white/55">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l) => {
              const score = l.quality_score ?? 0;
              const status = localStatus[l.id] ?? l.status ?? "new";

              return (
                <tr key={l.id} className="hover:bg-white/[0.03] transition">
                  <td className="border-t border-white/10 px-4 py-3">
                    <div className="font-semibold text-white">{l.username ?? "Unknown"}</div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                      {l.inferred_niche ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5">
                          {l.inferred_niche}
                        </span>
                      ) : null}

                      {l.website_platform ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5">
                          {l.website_platform}
                        </span>
                      ) : null}
                    </div>

                    {l.website ? (
                      <a
                        className="mt-2 inline-block text-xs text-cyan-200/90 hover:text-cyan-200 underline underline-offset-2"
                        href={l.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {l.website}
                      </a>
                    ) : (
                      <div className="mt-2 text-xs text-white/35">No website</div>
                    )}
                  </td>

                  <td className="border-t border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-white/80">
                        {score}/10
                      </div>
                      <div className="text-xs text-white/55">{scoreBadge(score)}</div>
                    </div>
                  </td>

                  <td className="border-t border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                        value={status}
                        onChange={(e) => updateStatus(l.id, e.target.value)}
                        disabled={savingId === l.id}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {prettyStatus(s)}
                          </option>
                        ))}
                      </select>

                      {savingId === l.id ? <span className="text-xs text-white/45">Saving…</span> : null}
                    </div>
                  </td>

                  <td className="border-t border-white/10 px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      {l.contact_email ? (
                        <a
                          className="text-cyan-200/90 hover:text-cyan-200 underline underline-offset-2"
                          href={`mailto:${l.contact_email}`}
                        >
                          {l.contact_email}
                        </a>
                      ) : null}

                      {l.contact_phone ? (
                        <a
                          className="text-cyan-200/90 hover:text-cyan-200 underline underline-offset-2"
                          href={`tel:${l.contact_phone}`}
                        >
                          {l.contact_phone}
                        </a>
                      ) : null}

                      {l.contact_whatsapp ? (
                        <a
                          className="text-cyan-200/90 hover:text-cyan-200 underline underline-offset-2"
                          href={l.contact_whatsapp}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      ) : null}

                      {!l.contact_email && !l.contact_phone && !l.contact_whatsapp ? (
                        <span className="text-white/45">DM-only</span>
                      ) : null}
                    </div>
                  </td>

                  <td className="border-t border-white/10 px-4 py-3 text-right">
                    <a
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                      href={`https://www.instagram.com/${l.username}/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open IG
                    </a>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="border-t border-white/10 px-4 py-8 text-center text-sm text-white/55">
                  No leads found with current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
