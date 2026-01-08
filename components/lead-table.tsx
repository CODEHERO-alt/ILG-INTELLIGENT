"use client";

import { useMemo, useState } from "react";
import LeadFilters, { LeadFiltersState } from "./lead-filters";

const STATUSES = ["new", "queued", "contacted", "loom_sent", "interested", "closed", "dead"];

export default function LeadTable({ leads }: { leads: any[] }) {
  const [filters, setFilters] = useState<LeadFiltersState>({
    search: "",
    status: "all",
    minScore: "7",
  });

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const minScore = Number(filters.minScore || "0");

    return (leads || [])
      .filter((l) => {
        if (filters.status !== "all" && l.status !== filters.status) return false;
        if ((l.quality_score ?? 0) < minScore) return false;

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
      <LeadFilters onChange={setFilters} />

      <table className="w-full border rounded overflow-hidden">
        <thead className="bg-slate-50">
          <tr>
            <th className="border p-2 text-left text-xs">Username</th>
            <th className="border p-2 text-left text-xs">Score</th>
            <th className="border p-2 text-left text-xs">Status</th>
            <th className="border p-2 text-left text-xs">Website</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((lead) => (
            <tr key={lead.id}>
              <td className="border p-2 text-sm font-medium">{lead.username}</td>
              <td className="border p-2 text-sm">{lead.quality_score ?? 0}</td>

              <td className="border p-2 text-sm">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={lead.status}
                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>

              <td className="border p-2 text-sm">
                {lead.website ? (
                  <a className="underline" href={lead.website} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
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
  );
}
