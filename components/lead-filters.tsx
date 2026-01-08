"use client";

import { useEffect, useState } from "react";

export type LeadFiltersState = {
  search: string;
  status: string;
  minScore: string;
  maxScore: string;
};

const STATUSES = ["all", "new", "queued", "contacted", "loom_sent", "interested", "closed", "dead"];

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

      <div className="w-full md:w-32">
        <label className="block text-xs text-slate-500 mb-1">Min</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          type="number"
          min={0}
          max={10}
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
        />
      </div>

      <div className="w-full md:w-32">
        <label className="block text-xs text-slate-500 mb-1">Max</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          type="number"
          min={0}
          max={10}
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
        />
      </div>

      <button
        className="border rounded px-3 py-2 text-sm"
        type="button"
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
  );
}
