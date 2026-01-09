import { searchWeb, type SerpResult } from "@/lib/instagramClient";

export type ContactDiscoveryResult = {
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  bio_link: string | null;
  sources: string[];
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function extractEmails(text: string) {
  const t = String(text || "");
  const matches = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  return uniq(matches.map((m) => m.toLowerCase()));
}

function extractPhones(text: string) {
  const t = String(text || "");

  // Very permissive phone regex; we'll normalize later.
  const matches = t.match(/(\+?\d[\d\s().-]{7,}\d)/g) ?? [];

  const normalized = matches
    .map((m) => m.replace(/[\s().-]/g, ""))
    .map((m) => (m.startsWith("00") ? `+${m.slice(2)}` : m))
    .filter((m) => m.length >= 8 && m.length <= 16);

  return uniq(normalized);
}

function extractWhatsApp(text: string) {
  const t = String(text || "").toLowerCase();

  // Common WhatsApp link forms
  const waLink =
    t.match(/https?:\/\/(wa\.me|api\.whatsapp\.com)\/[^\s)\]]+/i)?.[0] ?? null;

  // Sometimes snippets contain "WhatsApp: +123..."
  const waNumber = extractPhones(t).find((p) => p.includes("+")) ?? null;

  return { waLink, waNumber };
}

function extractBioLink(text: string) {
  const t = String(text || "");
  if (!t) return null;

  // Prefer linktree/beacons style links
  const m = t.match(
    /https?:\/\/(linktr\.ee|beacons\.ai|lnk\.bio|bio\.site|taplink\.cc)\/[^\s)\]]+/i
  );
  if (m?.[0]) return m[0];

  // Otherwise, first non-instagram URL
  const any = t.match(/https?:\/\/[^\s)\]]+/i)?.[0];
  if (any) {
    try {
      const u = new URL(any);
      if (!u.hostname.toLowerCase().includes("instagram.com")) return u.toString();
    } catch {
      // ignore
    }
  }

  // Naked domains
  const naked = t.match(/\b([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/)?.[0];
  if (naked && !/instagram\.com/i.test(naked)) return `https://${naked}`;

  return null;
}

function mergeSerpText(r: SerpResult) {
  return [r.title, r.snippet, r.link].filter(Boolean).join("\n");
}

export async function discoverContactsForUsername(
  username: string,
  opts?: { maxQueries?: number; resultsPerQuery?: number }
): Promise<ContactDiscoveryResult> {
  const maxQueries = Math.max(1, Math.min(5, Number(opts?.maxQueries ?? 2)));
  const resultsPerQuery = Math.max(3, Math.min(10, Number(opts?.resultsPerQuery ?? 5)));

  const queries = [
    `"${username}" (email OR gmail OR contact OR whatsapp OR "wa.me" OR linktr.ee OR beacons.ai OR taplink)`,
    `"@${username}" (email OR whatsapp OR contact OR linktr.ee OR beacons.ai OR taplink)`,
    `instagram "${username}" (email OR whatsapp OR contact)`,
  ].slice(0, maxQueries);

  const sources: string[] = [];
  const emails: string[] = [];
  const phones: string[] = [];
  let whatsapp: string | null = null;
  let bioLink: string | null = null;

  for (const q of queries) {
    const results = await searchWeb(q, resultsPerQuery);

    for (const r of results) {
      const text = mergeSerpText(r);
      sources.push(r.link || q);

      emails.push(...extractEmails(text));
      phones.push(...extractPhones(text));

      const wa = extractWhatsApp(text);
      if (!whatsapp && wa.waLink) whatsapp = wa.waLink;
      if (!whatsapp && wa.waNumber) whatsapp = wa.waNumber;

      if (!bioLink) {
        const b = extractBioLink(text);
        if (b) bioLink = b;
      }
    }

    // Stop early to save budget once we find strong signals.
    if (emails.length || phones.length || whatsapp || bioLink) break;
  }

  return {
    contact_email: emails[0] ?? null,
    contact_phone: phones[0] ?? null,
    contact_whatsapp: whatsapp ?? null,
    bio_link: bioLink ?? null,
    sources: uniq(sources).slice(0, 8),
  };
}
