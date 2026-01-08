export function scoreLead(input: {
  followers?: number | null;
  has_booking?: boolean | null;
  has_checkout?: boolean | null;
  offer_keywords?: string[] | null;
  has_website?: boolean | null;
  has_email?: boolean | null;
  has_phone?: boolean | null;
  has_whatsapp?: boolean | null;
}) {
  let score = 0;

  const followers = Number(input.followers ?? 0);

  if (followers >= 500) score += 1;
  if (followers >= 2_000) score += 1;
  if (followers >= 10_000) score += 1;
  if (followers >= 50_000) score += 1;

  if (input.has_website) score += 2;

  const contactSignals = [
    !!input.has_email,
    !!input.has_phone,
    !!input.has_whatsapp,
  ].filter(Boolean).length;

  if (contactSignals >= 1) score += 2;
  if (contactSignals >= 2) score += 1;

  if (input.has_booking) score += 1;
  if (input.has_checkout) score += 1;

  const kws = Array.isArray(input.offer_keywords) ? input.offer_keywords.filter(Boolean) : [];
  if (kws.length >= 3) score += 1;
  if (kws.length >= 8) score += 1;

  if (score < 0) score = 0;
  if (score > 10) score = 10;
  return score;
}
