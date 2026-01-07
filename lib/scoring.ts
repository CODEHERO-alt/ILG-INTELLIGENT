export type LeadSignals = {
  hasWebsite: boolean;
  offerKeywordsDetected: boolean;
  nicheKeywordsDetected: boolean;
  lastPostAt: string | null;
  followersCount: number | null;
  bookingOrCheckoutDetected: boolean;
  websiteLooksNonCommercial: boolean;
};

const MIN_FOLLOWERS = 1000;
const MAX_FOLLOWERS = 100000;

export function computeQualityScore(signals: LeadSignals): number {
  let score = 0;

  if (signals.hasWebsite && signals.offerKeywordsDetected) {
    score += 3;
  }

  if (signals.nicheKeywordsDetected) {
    score += 2;
  }

  if (signals.lastPostAt) {
    const last = new Date(signals.lastPostAt).getTime();
    const now = Date.now();
    const diffDays = (now - last) / (1000 * 60 * 60 * 24);
    if (diffDays <= 30) score += 2;
    else if (diffDays <= 60) score += 1;
  }

  if (
    typeof signals.followersCount === "number" &&
    signals.followersCount >= MIN_FOLLOWERS &&
    signals.followersCount <= MAX_FOLLOWERS
  ) {
    score += 1;
  }

  if (signals.bookingOrCheckoutDetected) {
    score += 1;
  }

  if (signals.websiteLooksNonCommercial) {
    score -= 2;
  }

  if (score < 0) score = 0;
  if (score > 10) score = 10;

  return score;
}
