"use client";

import { useEffect, useMemo, useState } from "react";

export type LeadFiltersState = {
  search: string;
  status: string;
  minScore: string;
  maxScore: string;
};

const STATUSES = [
  "all",
  "new",
  "queued",
  "contacted",
  "loom_sent",
  "interested",
  "closed",
  "dead",
];

function prettyStatus(s: string) {
  if (s === "all") return "All";
  return s.replace(/_/g, " ");
}

export default function LeadFilters({
  onChange,
  defaultMinScore = "7",
}: {
  onChange: (filters: LeadFiltersState) => void;
  defaultMinScore?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [minScore, setMinScore] = useState(defaultMinScore);
  const [maxScore, setMaxScore] = useState("");

  useEffect(() => {
    onChange({ search, status, minScore, maxScore });
  }, [search, status, minScore, maxScore, onChange]);

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim() !== "" ||
      status !== "all" ||
      (minScore ?? "") !== defaultMinScore ||
      (maxScore ?? "") !== ""
    );
  }, [search, status, minScore, maxScore, defaultMinScore]);

  return (
    <div className="mb-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1">
              <label className="block text-[11px] font-medium tracking-wide text-white/60 mb-1">
                Search
              </label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                placeholder="username, niche, website…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-full lg:w-56">
              <label className="block text-[11px] font-medium tracking-wide text-white/60 mb-1">
                Status
              </label>
              <select
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="text-black">
                    {prettyStatus(s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full lg:w-28">
              <label className="block text-[11px] font-medium tracking-wide text-white/60 mb-1">
                Min
              </label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                type="number"
                min={0}
                max={10}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </div>

            <div className="w-full lg:w-28">
              <label className="block text-[11px] font-medium tracking-wide text-white/60 mb-1">
                Max
              </label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                type="number"
                min={0}
                max={10}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>

            <button
              className="h-[42px] rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-white/15 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed backdrop-blur"
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => {
                setSearch("");
                setStatus("all");
                setMinScore(defaultMinScore);
                setMaxScore("");
              }}
            >
              Reset
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-white/45">
            <span>
              Tip: Use search like <span className="text-white/70">“saas”</span>{" "}
              or <span className="text-white/70">“shopify”</span>
            </span>
            {hasActiveFilters ? (
              <span className="text-white/55">Filters active</span>
            ) : (
              <span className="text-white/35">No filters</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
