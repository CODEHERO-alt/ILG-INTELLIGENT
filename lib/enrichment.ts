import * as cheerio from "cheerio";

export async function enrichWebsite(url: string) {
  try {
    const res = await fetch(url, { redirect: "follow", cache: "no-store" });
    const html = await res.text();
    const $ = cheerio.load(html);

    const text = $("body").text().toLowerCase();
    const title = $("title").text();

    const hasBooking = text.includes("book") || text.includes("appointment");
    const hasCheckout = text.includes("checkout") || text.includes("buy");

    let platform = "unknown";
    if (html.includes("shopify")) platform = "shopify";
    if (html.includes("wordpress")) platform = "wordpress";
    if (html.includes("wix")) platform = "wix";

    const keywords = ["coach", "agency", "shop", "clinic", "services"].filter(
      k => text.includes(k)
    );

    return {
      website_title: title,
      website_platform: platform,
      has_booking: hasBooking,
      has_checkout: hasCheckout,
      offer_keywords: keywords,
    };
  } catch {
    return null;
  }
}
