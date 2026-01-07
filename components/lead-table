"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LeadFilters } from "./lead-filters";
import { StatusBadge } from "./status-badge";
import { DMTemplateButton } from "./dm-template-button";
import Link from "next/link";

type Lead = {
  id: string;
  username: string;
  full_name: string | null;
  niche_guess: string | null;
  website_url: string | null;
  followers_count: number | null;
  last_post_at: string | null;
  quality_score: number;
  status: string;
};

async function fetchLeads(params: {
  status: string[];
  minScore: number;
  maxScore: number;
  niche: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  const usp = new URLSearchParams();
  params.status.forEach((s) => usp.append("status", s));
  usp.set("minScore", String(params.minScore));
  usp.set("maxScore", String(params.maxScore));
  if (params.niche) usp.set("niche", params.niche);
  if (params.search) usp.set("search", params.search);
  usp.set("page", String(params.page));
  usp.set("pageSize", String(params.pageSize));

  const res = await fetch(`/api/leads?${usp.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json() as Promise<{
    leads: Lead[];
    pagination: { total: number; page: number; pageSize: number };
  }>;
}

export function LeadTable() {
  const [status, setStatus] = useState<string[]>(["queued", "new"]);
  const [minScore, setMinScore] = useState(5);
  const [maxScore, setMaxScore] = useState(10);
  const [niche, setNiche] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["leads", { status, minScore, maxScore, niche, search, page }],
    queryFn: () =>
      fetchLeads({ status, minScore, maxScore, niche, search, page, pageSize })
    // React Query v5 no longer supports keepPreviousData – removed
  });

  const mutation = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const res = await fetch(`/api/leads/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
  });

  const leads = data?.leads ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-900/60">
      <div className="px-4 pt-4">
        <LeadFilters
          status={status}
          setStatus={(v) => {
            setStatus(v);
            setPage(1);
          }}
          minScore={minScore}
          maxScore={maxScore}
          setMinScore={(v) => {
            setMinScore(v);
            setPage(1);
          }}
          setMaxScore={(v) => {
            setMaxScore(v);
            setPage(1);
          }}
          niche={niche}
          setNiche={(v) => {
            setNiche(v);
            setPage(1);
          }}
          search={search}
          setSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-slate-400">Loading leads...</div>
        ) : isError ? (
          <div className="p-4 text-sm text-red-400">
            Failed to load leads. Try again.
          </div>
        ) : leads.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">
            No leads match current filters.
          </div>
        ) : (
          <table className="w-full text-xs md:text-sm">
            <thead className="bg-slate-900 border-t border-b border-slate-800">
              <tr className="text-left">
                <th className="px-4 py-2">Username</th>
                <th className="px-4 py-2">Niche</th>
                <th className="px-4 py-2">Followers</th>
                <th className="px-4 py-2">Last post</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-slate-800/80 hover:bg-slate-900/80"
                >
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:underline"
                      >
                        @{lead.username}
                      </Link>
                      {lead.full_name && (
                        <span className="text-xs text-slate-400">
                          {lead.full_name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {lead.niche_guess ?? (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {lead.followers_count?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {lead.last_post_at
                      ? new Date(lead.last_post_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-800 text-xs">
                      {lead.quality_score}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      <a
                        href={`https://instagram.com/${lead.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-md text-xs border border-slate-700 hover:bg-slate-800"
                      >
                        Open IG
                      </a>
                      {lead.website_url && (
                        <a
                          href={lead.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded-md text-xs border border-slate-700 hover:bg-slate-800"
                        >
                          Website
                        </a>
                      )}
                      <DMTemplateButton
                        username={lead.username}
                        nicheGuess={lead.niche_guess}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          mutation.mutate({
                            id: lead.id,
                            status: "contacted"
                          })
                        }
                        className="px-2 py-1 rounded-md text-xs border border-slate-700 hover:bg-slate-800"
                      >
                        Mark contacted
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          mutation.mutate({
                            id: lead.id,
                            status: "loom_sent"
                          })
                        }
                        className="px-2 py-1 rounded-md text-xs border border-slate-700 hover:bg-slate-800"
                      >
                        Mark Loom sent
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-xs border-t border-slate-800">
        <span className="text-slate-400">
          Page {page} of {totalPages} • {total} leads
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 border border-slate-700 rounded disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 border border-slate-700 rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
