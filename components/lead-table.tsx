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
  const [filters, setFilters] = useState<LeadFiltersState>({
    search: "",
    status: "all",
    minScore: "7",
    maxScore: "",
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const minScore = Number(filters.minScore || "0");
    const maxScoreRaw = (filters.maxScore ?? "").trim();
    const maxScore = maxScoreRaw === "" ? null : Number(maxScoreRaw);

    return (leads || [])
      .filter((l) => {
        const effectiveStatus = localStatus[l.id] ?? l.status ?? "new";

        if (filters.status !== "all" && effectiveStatus !== filters.status)
          return false;

        const score = l.quality_score ?? 0;
        if (score < minScore) return false;
        if (maxScore !== null && Number.isFinite(maxScore) && score > maxScore)
          return false;

        if (!q) return true;

        const hay = [
          l.username,
          l.bio,
          l.website,
          l.inferred_niche,
          l.website_title,
          l.website_platform,
          Array.isArray(l.offer_keywords) ? l.offer_keywords.join(" ") : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
  }, [leads, filters, localStatus]);

  const stats = useMemo(() => {
    const total = leads?.length ?? 0;
    const strong = (leads || []).filter((l) => (l.quality_score ?? 0) >= 7).length;
    const avg =
      total === 0
        ? 0
        : Math.round(
            ((leads || []).reduce((sum, l) => sum + (l.quality_score ?? 0), 0) /
              total) *
              10
          ) / 10;

    return { total, strong, avg };
  }, [leads]);

  async function updateStatus(id: string, status: string) {
    setLocalStatus((prev) => ({ ...prev, [id]: status })); // optimistic
    setSavingId(id);

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        // revert if server rejects
        setLocalStatus((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        alert("Failed to update status. Check API route / auth.");
        return;
      }

      window.location.reload();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4 shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
          <div className="text-[11px] uppercase tracking-wider text-white/45">
            Total leads
          </div>
          <div className="mt-1 text-2xl font-semibold text-white">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4 shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
          <div className="text-[11px] uppercase tracking-wider text-white/45">
            Strong (7+)
          </div>
          <div className="mt-1 text-2xl font-semibold text-white">{stats.strong}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4 shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
          <div className="text-[11px] uppercase tracking-wider text-white/45">
            Avg score
          </div>
          <div className="mt-1 text-2xl font-semibold text-white">{stats.avg}</div>
        </div>
      </div>

      <LeadFilters onChange={setFilters} defaultMinScore="7" />

      <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                      <div className="font-semibold text-white">
                        {l.username ?? "Unknown"}
                      </div>

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
                      <div className="text-white font-semibold">{score}</div>
                      <div className="text-xs text-white/50">{scoreBadge(score)}</div>
                    </td>

                    <td className="border-t border-white/10 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                          value={status}
                          onChange={(e) => updateStatus(l.id, e.target.value)}
                          disabled={savingId === l.id}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="text-black">
                              {prettyStatus(s)}
                            </option>
                          ))}
                        </select>

                        {savingId === l.id ? (
                          <span className="text-xs text-white/45">Saving…</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="border-t border-white/10 px-4 py-3 text-right">
                      <a
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-white/15 active:scale-[0.99] backdrop-blur"
                        href={`/leads/${l.id}`}
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10">
                    <div className="text-center">
                      <div className="text-white font-semibold">
                        No leads match your filters
                      </div>
                      <div className="mt-2 text-sm text-white/50">
                        Try clearing filters, lowering the minimum score, or searching by
                        website platform.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
