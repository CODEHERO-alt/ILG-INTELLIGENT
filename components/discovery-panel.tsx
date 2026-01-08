"use client";

import { useMemo, useState } from "react";

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; inserted: number; enrichedNow: number }
  | { status: "error"; message: string };

function parseList(input: string) {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function DiscoveryPanel() {
  const [niches, setNiches] = useState("dentist, gym, real estate");
  const [locations, setLocations] = useState("");
  const [intent, setIntent] = useState("booking, appointment, whatsapp");
  const [exclude, setExclude] = useState("meme, fanpage, quotes, repost");
  const [limit, setLimit] = useState(100);
  const [perQuery, setPerQuery] = useState(20);
  const [run, setRun] = useState<RunState>({ status: "idle" });

  const payload = useMemo(() => {
    return {
      niches: parseList(niches),
      locations: parseList(locations),
      intent: parseList(intent),
      exclude: parseList(exclude),
      limit: Number(limit) || 100,
      perQuery: Number(perQuery) || 20,
    };
  }, [niches, locations, intent, exclude, limit, perQuery]);

  async function onRun() {
    try {
      if (!payload.niches.length) {
        setRun({ status: "error", message: "Add at least 1 niche keyword." });
        return;
      }

      setRun({ status: "running" });

      const res = await fetch("/api/jobs/discover-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        const msg = json?.error || `Request failed (${res.status})`;
        setRun({ status: "error", message: msg });
        return;
      }

      setRun({
        status: "done",
        inserted: json.inserted ?? 0,
        enrichedNow: json.enrichedNow ?? 0,
      });

      window.location.reload();
    } catch (e: any) {
      setRun({ status: "error", message: e?.message || "Unknown error" });
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Discovery</h2>
          <p className="mt-1 text-sm text-slate-300">
            Enter niche + (optional) location + intent keywords. The system discovers Instagram profiles via web search,
            then enriches + scores them. DM-only accounts are still kept — they just score lower than contact-rich leads.
          </p>
        </div>

        <button
          onClick={onRun}
          disabled={run.status === "running"}
          className="mt-3 inline-flex items-center justify-center rounded-xl bg-[#0078D4] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0A84E8] disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0"
        >
          {run.status === "running" ? "Running…" : "Run discovery"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-200">Niche keywords (comma separated)</span>
          <input
            value={niches}
            onChange={(e) => setNiches(e.target.value)}
            placeholder="dentist, gym, realtor, med spa"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-white/20"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-200">Locations (optional)</span>
          <input
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
            placeholder="Dubai, Karachi, Toronto"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-white/20"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-200">Intent keywords (optional)</span>
          <input
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="booking, appointment, order, whatsapp"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-white/20"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-200">Exclude keywords (optional)</span>
          <input
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
            placeholder="meme, fanpage, quotes"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-white/20"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-200">Daily limit (1–500)</span>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            min={1}
            max={500}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-white/20"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-200">Results per query (5–50)</span>
          <input
            type="number"
            value={perQuery}
            onChange={(e) => setPerQuery(Number(e.target.value))}
            min={5}
            max={50}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-white/20"
          />
        </label>
      </div>

      {run.status === "error" ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {run.message}
        </div>
      ) : null}

      {run.status === "done" ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Done. Inserted: <b>{run.inserted}</b> • Enriched now: <b>{run.enrichedNow}</b>
        </div>
      ) : null}

      <div className="mt-4 text-xs text-slate-400">
        <b>Note:</b> To actually discover accounts, configure a search provider:
        {" "}
        <span className="text-slate-200">SERPER_API_KEY</span> (recommended) or{" "}
        <span className="text-slate-200">SERPAPI_KEY</span>. You can optionally set{" "}
        <span className="text-slate-200">SEARCH_PROVIDER</span> to{" "}
        <span className="text-slate-200">serper</span> or{" "}
        <span className="text-slate-200">serpapi</span>.
      </div>
    </section>
  );
}
