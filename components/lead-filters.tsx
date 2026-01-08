"use client";

import { useMemo, useState } from "react";

export type LeadFiltersState = {
  search: string;
  status: string;
  minScore: string;
};

const STATUSES = ["all", "new", "queued", "contacted", "loom_sent", "interested", "closed", "dead"];

export default function LeadFilters({
  onChange,
}: {
  onChange: (filters: LeadFiltersState) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [minScore, setMinScore] = useState("7");

  const state = useMemo(() => ({ search, status, minScore }), [search, status, minScore]);

  // Push changes upward whenever state changes
  useMemo(() => {
    onChange(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.search, state.status, state.minScore]);

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-end mb-4">
      <div className="flex-1">
        <label className="block text-xs text-slate-500 mb-1">Search</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="username, niche, website…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="w-full md:w-56">
        <label className="block text-xs text-slate-500 mb-1">Status</label>
        <select
          className="w-full border rounded px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All" : s}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full md:w-40">
        <label className="block text-xs text-slate-500 mb-1">Min score</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          type="number"
          min={0}
          max={10}
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
        />
      </div>

      <button
        className="border rounded px-3 py-2 text-sm"
        onClick={() => {
          setSearch("");
          setStatus("all");
          setMinScore("7");
        }}
        type="button"
      >
        Reset
      </button>
    </div>
  );
}
