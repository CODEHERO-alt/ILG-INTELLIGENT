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

export type SerpResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

function normalizeKeyword(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function buildQueries(params: DiscoverParams) {
  const niches = params.niches.map(normalizeKeyword).filter(Boolean);
  const locations = (params.locations ?? []).map(normalizeKeyword).filter(Boolean);
  const intentInput = (params.intent ?? []).map(normalizeKeyword).filter(Boolean);
  const exclude = (params.exclude ?? []).map(normalizeKeyword).filter(Boolean);

  // If user didn't provide intent, we lightly expand with common buyer-intent terms.
  const defaultIntents = [
    "",
    "coach",
    "agency",
    "studio",
    "clinic",
    "consultant",
    "founder",
    "book",
    "dm",
    "whatsapp",
  ];
  const intentCombos = intentInput.length ? uniq(intentInput) : defaultIntents;

  const locCombos = locations.length ? uniq(locations) : [""];

  const excludes = [
    "-inurl:/p/",
    "-inurl:/reel/",
    "-inurl:/tv/",
    "-inurl:/explore/",
    "-inurl:/tags/",
    "-inurl:/stories/",
    ...exclude.map((e) => `-"${e}"`),
  ];

  // Multiple templates to increase yield while still targeting profile pages.
  const templates: Array<(parts: string[]) => string> = [
    // Strict quoted intent.
    (parts) => `site:instagram.com ${parts.map((p) => `"${p}"`).join(" ")}`,
    // Slightly looser (helps Serper/Google return profiles when quotes are too strict).
    (parts) => `site:instagram.com ${parts.join(" ")}`,
    // Bias toward contact / booking intent.
    (parts) =>
      `site:instagram.com ${parts
        .map((p) => `"${p}"`)
        .join(" ")} ("book" OR "dm" OR "whatsapp" OR "contact")`,
  ];

  const queries: string[] = [];

  for (const niche of niches) {
    for (const loc of locCombos) {
      for (const i of intentCombos) {
        const parts = [niche, loc, i].filter(Boolean);
        if (!parts.length) continue;

        for (const t of templates) {
          queries.push(`${t(parts)} ${excludes.join(" ")}`.trim());
        }
      }
    }
  }

  // Dedupe while preserving order.
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

function isLikelyProfileSegment(seg: string) {
  const blocked = new Set([
    "",
    "p",
    "reel",
    "tv",
    "explore",
    "tags",
    "stories",
    "accounts",
    "about",
    "developer",
    "directory",
    "web",
    "graphql",
  ]);
  return !blocked.has(seg);
}

function sanitizeUsername(candidate: string) {
  const username = candidate.replace(/[^a-zA-Z0-9._]/g, "");
  if (!username) return null;
  if (username.length > 30) return null;
  return username.toLowerCase();
}

function extractInstagramUsername(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    // Support m.instagram.com too
    if (!host.endsWith("instagram.com")) return null;

    const parts = u.pathname.split("/").filter(Boolean);

    // ✅ TS-safe: don't assume parts[0] exists
    const firstRaw = parts[0];
    if (!firstRaw) return null;

    const first = firstRaw.toLowerCase();
    if (!isLikelyProfileSegment(first)) return null;

    return sanitizeUsername(first);
  } catch {
    return null;
  }
}

function extractInstagramUsernameFromText(text: string): string | null {
  const t = String(text || "");
  if (!t) return null;

  // Look for explicit instagram.com/<user>
  const m1 = t.match(/instagram\.com\/([a-zA-Z0-9._]{1,30})/i);
  if (m1?.[1]) {
    const seg = m1[1].toLowerCase();
    if (isLikelyProfileSegment(seg)) return sanitizeUsername(seg);
  }

  // Look for @username patterns
  const m2 = t.match(/\B@([a-zA-Z0-9._]{1,30})\b/);
  if (m2?.[1]) return sanitizeUsername(m2[1]);

  return null;
}

function extractWebsiteFromText(text?: string): string | null {
  const t = String(text || "");
  if (!t) return null;

  const urlMatch = t.match(/https?:\/\/[^\s)\]]+/i);
  if (urlMatch?.[0]) {
    try {
      const u = new URL(urlMatch[0]);
      const host = u.hostname.toLowerCase();
      // Return any non-instagram URL as website
      if (!host.includes("instagram.com")) return u.toString();
    } catch {
      // ignore
    }
  }

  const nakedDomainMatch = t.match(/\b([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/);
  if (nakedDomainMatch?.[0]) {
    const candidate = nakedDomainMatch[0];
    if (!/instagram\.com/i.test(candidate)) return `https://${candidate}`;
  }

  const bioLinkMatch = t.match(
    /\b(linktr\.ee|beacons\.ai|lnk\.bio|bio\.site|taplink\.cc)\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/i
  );
  if (bioLinkMatch?.[0]) {
    return `https://${bioLinkMatch[0]}`;
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  return {
    signal: ac.signal,
    wrapped: promise.finally(() => clearTimeout(id)),
  };
}

async function fetchJsonWithRetry(url: string, init: RequestInit, label: string) {
  const maxAttempts = Number(process.env.SEARCH_RETRY_MAX ?? "4");
  const baseDelayMs = Number(process.env.SEARCH_RETRY_BASE_MS ?? "450");
  const timeoutMs = Number(process.env.SEARCH_TIMEOUT_MS ?? "20000");

  let lastErr: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { signal, wrapped } = withTimeout(
        fetch(url, { ...init, signal, cache: "no-store" }),
        timeoutMs
      );
      const res = await wrapped;

      if (res.ok) return await res.json();

      const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
      const body = await res.text().catch(() => "");
      const err = new Error(`${label} ${res.status}: ${body || res.statusText}`);
      lastErr = err;

      if (!retryable || attempt === maxAttempts) throw err;

      const jitter = Math.floor(Math.random() * 150);
      await sleep(baseDelayMs * Math.pow(2, attempt - 1) + jitter);
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || "");
      const retryable = msg.includes("aborted") || msg.includes("429") || msg.includes("5");
      if (!retryable || attempt === maxAttempts) break;

      const jitter = Math.floor(Math.random() * 150);
      await sleep(baseDelayMs * Math.pow(2, attempt - 1) + jitter);
    }
  }

  throw lastErr ?? new Error(`${label}: request failed`);
}

async function fetchSerperResults(query: string, num: number): Promise<SerpResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY is missing");

  const json = await fetchJsonWithRetry(
    "https://google.serper.dev/search",
    {
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
    },
    "SERPER_ERROR"
  );

  const organic = Array.isArray((json as any)?.organic) ? ((json as any).organic as any[]) : [];
  return organic.map((r) => ({
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

  const json = await fetchJsonWithRetry(url.toString(), { method: "GET" }, "SERPAPI_ERROR");
  const organic = Array.isArray((json as any)?.organic_results)
    ? ((json as any).organic_results as any[])
    : [];

  return organic.map((r) => ({
    title: r?.title,
    link: r?.link,
    snippet: r?.snippet,
  }));
}

async function fetchSearchResults(query: string, num: number): Promise<SerpResult[]> {
  if (process.env.SERPER_API_KEY) return fetchSerperResults(query, num);
  if (process.env.SERPAPI_KEY) return fetchSerpApiResults(query, num);

  throw new Error("No search provider configured. Set SERPER_API_KEY (recommended) or SERPAPI_KEY.");
}

export async function searchWeb(query: string, num = 10) {
  return fetchSearchResults(query, num);
}

function pLimit(concurrency: number) {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const fn = queue.shift();
      if (fn) fn();
    }
  };

  return async <T>(fn: () => Promise<T>) => {
    if (activeCount >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    activeCount++;
    try {
      const result = await fn();
      return result;
    } finally {
      next();
    }
  };
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

  const maxConcurrency = Number(process.env.SEARCH_CONCURRENCY ?? "3");
  const limit = pLimit(Math.max(1, Math.min(6, maxConcurrency)));

  // process queries with controlled concurrency
  await Promise.all(
    queries.map((q) =>
      limit(async () => {
        if (candidates.length >= hardLimit) return;

        const results = await fetchSearchResults(q, perQuery);

        for (const r of results) {
          if (candidates.length >= hardLimit) break;

          // Prefer link, but fallback to snippet/title.
          const u =
            (r.link ? extractInstagramUsername(r.link) : null) ??
            extractInstagramUsernameFromText(r.snippet || "") ??
            extractInstagramUsernameFromText(r.title || "");

          if (!u) continue;

          // Try to infer a website/bio-link from snippet/title as a hint.
          const website = extractWebsiteFromText(r.snippet) ?? extractWebsiteFromText(r.title) ?? null;

          candidates.push({
            username: u,
            website,
            inferred_niche: params.niches?.[0] ?? null,
            source_query: q,
          });
        }
      })
    )
  );

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
