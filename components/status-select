"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

const STATUSES = [
  "new",
  "queued",
  "contacted",
  "loom_sent",
  "interested",
  "closed",
  "dead"
];

export function StatusSelect({ value, onChange }: Props) {
  return (
    <select
      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
