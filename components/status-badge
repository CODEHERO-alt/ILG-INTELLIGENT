export function StatusBadge({ status }: { status: string }) {
  const color = (() => {
    switch (status) {
      case "queued":
        return "bg-sky-600/20 text-sky-300 border-sky-600/60";
      case "contacted":
        return "bg-amber-600/20 text-amber-200 border-amber-600/60";
      case "loom_sent":
        return "bg-purple-600/20 text-purple-200 border-purple-600/60";
      case "interested":
        return "bg-emerald-600/20 text-emerald-200 border-emerald-600/60";
      case "closed":
        return "bg-emerald-700/30 text-emerald-100 border-emerald-700";
      case "dead":
        return "bg-slate-700/40 text-slate-300 border-slate-700";
      default:
        return "bg-slate-800/40 text-slate-200 border-slate-700";
    }
  })();

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${color}`}
    >
      {status}
    </span>
  );
}
