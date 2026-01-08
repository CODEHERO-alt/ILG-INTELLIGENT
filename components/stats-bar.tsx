"use client";

import { useQuery } from "@tanstack/react-query";

type Metrics = {
  total_leads: number | null;
  leads_by_status: { status: string; count: number }[];
  leads_discovered_last_7_days: number | null;
  leads_contacted_last_7_days: number | null;
  leads_interested_last_7_days: number | null;
  leads_closed_last_30_days: number | null;
};

async function fetchMetrics(): Promise<Metrics> {
  const res = await fetch("/api/metrics");
  if (!res.ok) throw new Error("Failed metrics");
  return res.json();
}

export function StatsBar() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    refetchInterval: 60_000
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="h-16 bg-slate-900/60 animate-pulse rounded-lg" />
        <div className="h-16 bg-slate-900/60 animate-pulse rounded-lg" />
        <div className="h-16 bg-slate-900/60 animate-pulse rounded-lg" />
        <div className="h-16 bg-slate-900/60 animate-pulse rounded-lg" />
      </div>
    );
  }

  const statusMap = new Map<string, number>();
  for (const s of data.leads_by_status ?? []) {
    statusMap.set(s.status, (s as any).count ?? 0);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="Total leads"
        value={data.total_leads ?? 0}
      />
      <StatCard
        label="Queued"
        value={statusMap.get("queued") ?? 0}
      />
      <StatCard
        label="Contacted (7d)"
        value={data.leads_contacted_last_7_days ?? 0}
      />
      <StatCard
        label="Closed (30d)"
        value={data.leads_closed_last_30_days ?? 0}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
