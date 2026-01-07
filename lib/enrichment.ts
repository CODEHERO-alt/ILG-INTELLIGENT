import * as cheerio from "cheerio";

const OFFER_KEYWORDS = [
  "program",
  "coaching",
  "1:1",
  "1-1",
  "consulting",
  "membership",
  "course",
  "mastermind",
  "intensive",
  "done for you"
];

const NICHE_KEYWORDS = [
  "coach",
  "consultant",
  "mentor",
  "founder",
  "agency",
  "clinic",
  "lawyer",
  "law firm",
  "dentist",
  "real estate",
  "realtor",
  "saas",
  "software",
  "startup"
];

const BOOKING_DOMAINS = ["calendly.com", "tidycal.com", "savvycal.com"];
const CHECKOUT_HINTS = ["checkout", "pricing", "plans", "subscribe", "enroll"];

type EnrichmentResult = {
  pageTitle?: string;
  metaDescription?: string;
  mainHeading?: string;
  offerKeywordsDetected: boolean;
  nicheKeywordsDetected: boolean;
  bookingOrCheckoutDetected: boolean;
  websiteLooksNonCommercial: boolean;
  inferredNiche?: string;
};

export async function enrichWebsite(url: string): Promise<EnrichmentResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; PehchaanMedia-InstagramLeadEngine/1.0)"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const pageTitle = $("title").first().text().trim() || undefined;
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() || undefined;
    const mainHeading = $("h1").first().text().trim() || undefined;

    const textBlob = $("body").text().toLowerCase();

    const offerDetected = OFFER_KEYWORDS.some((k) =>
      textBlob.includes(k.toLowerCase())
    );
    const nicheDetected = NICHE_KEYWORDS.some((k) =>
      textBlob.includes(k.toLowerCase())
    );

    const bookingOrCheckout =
      BOOKING_DOMAINS.some((domain) => html.toLowerCase().includes(domain)) ||
      CHECKOUT_HINTS.some((hint) => textBlob.includes(hint));

    const nonCommercial =
      !offerDetected && !bookingOrCheckout && textBlob.includes("blog");

    const inferredNiche =
      NICHE_KEYWORDS.find((k) => textBlob.includes(k.toLowerCase())) ?? undefined;

    return {
      pageTitle,
      metaDescription,
      mainHeading,
      offerKeywordsDetected: offerDetected,
      nicheKeywordsDetected: nicheDetected,
      bookingOrCheckoutDetected: bookingOrCheckout,
      websiteLooksNonCommercial: nonCommercial,
      inferredNiche
    };
  } catch {
    return null;
  }
}
