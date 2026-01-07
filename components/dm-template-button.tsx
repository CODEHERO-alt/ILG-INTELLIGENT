"use client";

import { buildOutreachDM } from "@/lib/dmTemplates";

type Props = {
  username: string;
  nicheGuess?: string | null;
};

export function DMTemplateButton({ username, nicheGuess }: Props) {
  async function handleCopy() {
    const text = buildOutreachDM({ username, nicheGuess });
    await navigator.clipboard.writeText(text);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2 py-1 rounded-md text-xs border border-slate-700 hover:bg-slate-800"
    >
      Copy DM template
    </button>
  );
}
