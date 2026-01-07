export type DiscoveredInstagramAccount = {
  username: string;
  full_name?: string | null;
  bio?: string | null;
  website_url?: string | null;
  followers_count?: number | null;
  following_count?: number | null;
  is_business?: boolean | null;
  last_post_at?: string | null;
  source_tag?: string | null;
};

export async function discoverFromHashtags(input: {
  hashtags: string[];
  limitPerHashtag: number;
}): Promise<DiscoveredInstagramAccount[]> {
  // TODO: implement Puppeteer/Playwright or Graph API here.
  // For now, returns empty array to keep jobs safe in production
  // until you plug in the real implementation.
  console.warn("discoverFromHashtags called but not implemented");
  return [];
}

export async function discoverFromSeedAccounts(input: {
  usernames: string[];
  limitPerSeed: number;
}): Promise<DiscoveredInstagramAccount[]> {
  console.warn("discoverFromSeedAccounts called but not implemented");
  return [];
}
