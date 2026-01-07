"use client";

type Props = {
  status: string[];
  setStatus: (v: string[]) => void;
  minScore: number;
  maxScore: number;
  setMinScore: (v: number) => void;
  setMaxScore: (v: number) => void;
  niche: string;
  setNiche: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
};

const ALL_STATUSES = [
  "new",
  "queued",
  "contacted",
  "loom_sent",
  "interested",
  "closed",
  "dead"
];

export function LeadFilters(props: Props) {
  const {
    status,
    setStatus,
    minScore,
    maxScore,
    setMinScore,
    setMaxScore,
    niche,
    setNiche,
    search,
    setSearch
  } = props;

  function toggleStatus(s: string) {
    if (status.includes(s)) {
      setStatus(status.filter((x) => x !== s));
    } else {
      setStatus([...status, s]);
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => {
          const active = status.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={`px-2 py-1 rounded-full text-xs border ${
                active
                  ? "bg-sky-600 border-sky-500"
                  : "border-slate-700 bg-slate-900/60"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Score range</label>
          <div className="flex gap-1 items-center">
            <input
              type="number"
              min={0}
              max={10}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
            />
            <span className="text-xs">–</span>
            <input
              type="number"
              min={0}
              max={10}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Niche contains</label>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="username / name"
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
