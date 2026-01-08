import { z } from "zod";

export const DiscoverParamsSchema = z.object({
  niches: z.array(z.string().min(1)).min(1),
  locations: z.array(z.string().min(1)).optional().default([]),
  intent: z.array(z.string().min(1)).optional().default([]),
  exclude: z.array(z.string().min(1)).optional().default([]),
  limit: z.number().int().min(1).max(500).default(100),
  perQuery: z.number().int().min(5).max(50).default(20),
});

export type DiscoverParams = z.infer<typeof DiscoverParamsSchema>;

type SerpResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

function normalizeKeyword(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function buildQueries(params: DiscoverParams) {
  const niches = params.niches.map(normalizeKeyword).filter(Boolean);
  const locations = (params.locations ?? []).map(normalizeKeyword).filter(Boolean);
  const intent = (params.intent ?? []).map(normalizeKeyword).filter(Boolean);
  const exclude = (params.exclude ?? []).map(normalizeKeyword).filter(Boolean);

  const locCombos = locations.length ? locations : [""];
  const intentCombos = intent.length ? intent : [""];

  const queries: string[] = [];

  for (const niche of niches) {
    for (const loc of locCombos) {
      for (const i of intentCombos) {
        const parts = [niche, loc, i].filter(Boolean);
        if (!parts.length) continue;

        let q = `site:instagram.com ${parts.map((p) => `"${p}"`).join(" ")}`;

        const excludes = [
          "site:instagram.com/p",
          "site:instagram.com/reel",
          "site:instagram.com/tv",
          "site:instagram.com/explore",
          "site:instagram.com/tags",
          ...exclude.map((e) => `-"${e}"`),
        ];

        q = `${q} ${excludes.join(" ")}`;
        queries.push(q);
      }
    }
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of queries) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }

  return out;
}

function extractInstagramUsername(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.endsWith("instagram.com")) return null;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    const first = parts[0];
    if (!first) return null; // ✅ TS guard

    const blocked = new Set<string>([
      "p",
      "reel",
      "tv",
      "explore",
      "stories",
      "tags",
      "accounts",
      "about",
      "developer",
      "directory",
      "web",
      "graphql",
    ]);

    if (blocked.has(first)) return null;

    const username = first.replace(/[^a-zA-Z0-9._]/g, "");
    if (!username) return null;
    if (username.length > 30) return null;

    return username.toLowerCase();
  } catch {
    return null;
  }
}

function extractPossibleWebsiteFromText(text: string) {
  const t = (text || "").trim();
  if (!t) return null;

  const urlMatch = t.match(/https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/i);
  if (urlMatch?.[0]) {
    const candidate = urlMatch[0];
    if (!/instagram\.com/i.test(candidate)) return candidate;
  }

  const wwwMatch = t.match(/\bwww\.[\w\-]+\.[\w\-.]{2,}(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)?/i);
  if (wwwMatch?.[0]) {
    const candidate = `https://${wwwMatch[0]}`;
    if (!/instagram\.com/i.test(candidate)) return candidate;
  }

  const linkTreeMatch = t.match(/\b(linktr\.ee|beacons\.ai|lnk\.bio|bio\.site|taplink\.cc)\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/i);
  if (linkTreeMatch?.[0]) {
    return `https://${linkTreeMatch[0]}`;
  }

  return null;
}

async function fetchSerperResults(query: string, num: number): Promise<SerpResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY is missing");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num,
      autocorrect: true,
      gl: process.env.SEARCH_GL ?? "us",
      hl: process.env.SEARCH_HL ?? "en",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SERPER_ERROR ${res.status}: ${text || res.statusText}`);
  }

  const json = await res.json();
  const organic = Array.isArray(json?.organic) ? json.organic : [];
  return organic.map((r: any) => ({
    title: r?.title,
    link: r?.link,
    snippet: r?.snippet,
  }));
}

async function fetchSerpApiResults(query: string, num: number): Promise<SerpResult[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error("SERPAPI_KEY is missing");

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", key);
  url.searchParams.set("num", String(num));
  url.searchParams.set("hl", process.env.SEARCH_HL ?? "en");
  url.searchParams.set("gl", process.env.SEARCH_GL ?? "us");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SERPAPI_ERROR ${res.status}: ${text || res.statusText}`);
  }

  const json = await res.json();
  const organic = Array.isArray(json?.organic_results) ? json.organic_results : [];
  return organic.map((r: any) => ({
    title: r?.title,
    link: r?.link,
    snippet: r?.snippet,
  }));
}

async function searchWeb(query: string, num: number): Promise<SerpResult[]> {
  const provider = (process.env.SEARCH_PROVIDER || "").toLowerCase().trim();
  if (provider === "serper") return fetchSerperResults(query, num);
  if (provider === "serpapi") return fetchSerpApiResults(query, num);

  if (process.env.SERPER_API_KEY) return fetchSerperResults(query, num);
  if (process.env.SERPAPI_KEY) return fetchSerpApiResults(query, num);

  throw new Error("No search provider configured. Set SERPER_API_KEY (recommended) or SERPAPI_KEY.");
}

export async function discoverInstagramAccounts(rawParams?: Partial<DiscoverParams>) {
  const params = DiscoverParamsSchema.parse(rawParams ?? { niches: ["business"] });
  const queries = buildQueries(params);

  const perQuery = params.perQuery;
  const hardLimit = params.limit;

  const candidates: Array<{
    username: string;
    website?: string | null;
    inferred_niche?: string | null;
    source_query?: string | null;
  }> = [];

  for (const q of queries) {
    if (candidates.length >= hardLimit) break;

    const results = await searchWeb(q, perQuery);

    for (const r of results) {
      if (candidates.length >= hardLimit) break;

      const link = r.link || "";
      const username = extractInstagramUsername(link);
      if (!username) continue;

      const website =
        extractPossibleWebsiteFromText(r.snippet || "") ||
        extractPossibleWebsiteFromText(r.title || "") ||
        null;

      candidates.push({
        username,
        website,
        inferred_niche: params.niches?.[0] ?? null,
        source_query: q,
      });
    }
  }

  const byUser = new Map<string, (typeof candidates)[number]>();
  for (const c of candidates) {
    if (!byUser.has(c.username)) byUser.set(c.username, c);
  }

  const out = Array.from(byUser.values()).slice(0, hardLimit);

  return out.map((x) => ({
    username: x.username,
    website: x.website || null,
    inferred_niche: x.inferred_niche || null,
    status: "new" as const,
  }));
}
