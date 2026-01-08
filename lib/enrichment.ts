import * as cheerio from "cheerio";

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function normalizeUrl(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function extractEmails(text: string) {
  const emails = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
    .map((e) => e.toLowerCase())
    .filter((e) => !e.endsWith("@example.com"));
  return uniq(emails).slice(0, 5);
}

function extractPhones(text: string) {
  const candidates = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [];
  const cleaned = candidates
    .map((c) => c.replace(/\s+/g, " ").trim())
    .filter((c) => c.length >= 8 && c.length <= 20);
  return uniq(cleaned).slice(0, 5);
}

function extractWhatsApp(html: string) {
  const m =
    html.match(/https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\s"'<>]+/i) ||
    html.match(/\bwa\.me\/[^\s"'<>]+/i) ||
    html.match(/\bapi\.whatsapp\.com\/[^\s"'<>]+/i);

  if (!m?.[0]) return null;
  const raw = m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
  return raw;
}

export async function enrichWebsite(url: string) {
  try {
    const normalized = normalizeUrl(url);
    if (!normalized) return null;

    const res = await fetch(normalized, { redirect: "follow", cache: "no-store" });

    const html = await res.text().catch(() => "");
    if (!html) return null;

    const $ = cheerio.load(html);

    const bodyText = ($("body").text() || "").toLowerCase();
    const title = ($("title").text() || "").trim();

    const hasBooking =
      bodyText.includes("book") ||
      bodyText.includes("appointment") ||
      bodyText.includes("schedule") ||
      bodyText.includes("reservation");

    const hasCheckout =
      bodyText.includes("checkout") ||
      bodyText.includes("add to cart") ||
      bodyText.includes("cart") ||
      bodyText.includes("buy now") ||
      bodyText.includes("order now");

    const keywords: string[] = [];
    const addKeyword = (k: string) => {
      const kk = (k || "").trim().toLowerCase();
      if (!kk) return;
      if (kk.length < 3) return;
      keywords.push(kk);
    };

    const metaDesc =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    const h1 = $("h1").first().text();

    addKeyword(h1);
    addKeyword(title);
    addKeyword(metaDesc);

    const htmlLower = html.toLowerCase();
    let platform = "";
    if (htmlLower.includes("wp-content") || htmlLower.includes("wordpress")) platform = "wordpress";
    else if (htmlLower.includes("cdn.shopify.com") || htmlLower.includes("shopify")) platform = "shopify";
    else if (htmlLower.includes("wix.com") || htmlLower.includes("wix-site")) platform = "wix";
    else if (htmlLower.includes("squarespace")) platform = "squarespace";

    const emails = extractEmails(html);
    const phones = extractPhones(html);
    const whatsapp = extractWhatsApp(html);

    const contact_email = emails[0] || null;
    const contact_phone = phones[0] || null;
    const contact_whatsapp = whatsapp || null;

    return {
      website_title: title || null,
      website_platform: platform || null,
      has_booking: hasBooking,
      has_checkout: hasCheckout,
      offer_keywords: uniq(
        keywords
          .join(" ")
          .split(/[^a-z0-9]+/g)
          .filter(Boolean)
      ).slice(0, 30),

      contact_email,
      contact_phone,
      contact_whatsapp,
    };
  } catch {
    return null;
  }
}
