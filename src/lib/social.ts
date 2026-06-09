/** Supported social channels for the planner (labels for the UI). */
export const SOCIAL_CHANNELS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "google", label: "Google Business" },
  { key: "linkedin", label: "LinkedIn" },
] as const;

export const SOCIAL_CHANNEL_KEYS = SOCIAL_CHANNELS.map((c) => c.key);

export function channelLabel(key: string): string {
  return SOCIAL_CHANNELS.find((c) => c.key === key)?.label ?? key;
}
