"use client";

import * as React from "react";

export default function ExportLeadsButton() {
  const [loading, setLoading] = React.useState(false);

  async function handleExport() {
    try {
      setLoading(true);

      const res = await fetch("/api/leads/export", { method: "GET" });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Export failed (${res.status})`);
      }

      const blob = await res.blob();

      // try to read filename from header
      const cd = res.headers.get("content-disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "ilg-leads.csv";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Could not export CSV. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="px-3 py-2 rounded-xl text-sm border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Exporting..." : "Export CSV"}
    </button>
  );
}
