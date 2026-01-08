"use client";

import { useMemo, useState } from "react";
import LeadFilters, { LeadFiltersState } from "./lead-filters";

const STATUSES = ["new", "queued", "contacted", "loom_sent", "interested", "closed", "dead"];

export default function LeadTable({ leads }: { leads: any[] }) {
  const [filters, setFilters] = useState<LeadFiltersState>({
    search: "",
    status: "all",
    minScore: "7",
    maxScore: "",
  });

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const minScore = Number(filters.minScore || "0");
    const maxScoreRaw = (filters.maxScore ?? "").trim();
    const maxScore = maxScoreRaw === "" ? null : Number(maxScoreRaw);

    return (leads || [])
      .filter((l) => {
        if (filters.status !== "all" && l.status !== filters.status) return false;

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
          Array.isArray(l.offer_keywords) ? l.offer_keywords.join(" ") : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
  }, [leads, filters]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    // simplest refresh: full reload so server list updates
    window.location.reload();
  }

  return (
    <div>
      <LeadFilters onChange={setFilters} defaultMinScore="7" />

      <div className="overflow-x-auto mt-4 border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-3 border-b">Lead</th>
              <th className="text-left p-3 border-b">Score</th>
              <th className="text-left p-3 border-b">Status</th>
              <th className="text-left p-3 border-b">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td className="border-t p-3">
                  <div className="font-medium">{l.username ?? "Unknown"}</div>
                  {l.website ? (
                    <a
                      className="text-xs text-blue-600 underline"
                      href={l.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {l.website}
                    </a>
                  ) : (
                    <div className="text-xs text-slate-400">No website</div>
                  )}
                </td>

                <td className="border-t p-3">{l.quality_score ?? 0}</td>

                <td className="border-t p-3">
                  <select
                    className="border rounded p-1"
                    value={l.status ?? "new"}
                    onChange={(e) => updateStatus(l.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="border-t p-3">
                  <a
                    className="text-blue-600 underline"
                    href={`/leads/${l.id}`}
                  >
                    Open
                  </a>
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td className="border p-3 text-sm text-slate-500" colSpan={4}>
                  No leads match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
