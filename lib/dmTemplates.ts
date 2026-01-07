export function buildOutreachDM(params: {
  username: string;
  nicheGuess?: string | null;
}) {
  const { username, nicheGuess } = params;

  const nichePart = nicheGuess ? ` in the ${nicheGuess} space` : "";
  return `Hey ${username} — saw what you're doing${nichePart} on IG.

I build revenue-focused sites for coaches, founders and service businesses.

If you like, I can send you a quick 90–120s Loom breaking down:
• 1–2 fast trust tweaks
• 1 clear conversion improvement for your site

No pressure either way, just thought it might be useful. Want me to record one for you?`;
}
