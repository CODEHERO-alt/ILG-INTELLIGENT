export function scoreLead(input: {
  followers: number;
  has_booking: boolean;
  has_checkout: boolean;
  offer_keywords?: string[];
}) {
  let score = 0;

  if (input.followers > 1000) score += 2;
  if (input.followers > 5000) score += 2;
  if (input.followers > 20000) score += 2;

  if (input.has_booking) score += 2;
  if (input.has_checkout) score += 2;

  if (input.offer_keywords && input.offer_keywords.length > 0) {
    score += 2;
  }

  return Math.min(score, 10);
}
