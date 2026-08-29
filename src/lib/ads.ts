/**
 * Ad slot abstraction for marketing / share surfaces.
 * UGC share ads stay off unless explicitly enabled.
 */

export type AdSlotId =
  | "home-below-fold"
  | "landing-below-fold"
  | "share-below-image";

export function ugcShareAdsEnabled(env: {
  UGC_SHARE_ADS_ENABLED?: string;
}): boolean {
  return env.UGC_SHARE_ADS_ENABLED === "true";
}

/** Reserved placeholder markup. Empty when disabled. */
export function renderAdSlot(
  id: AdSlotId,
  opts: { enabled?: boolean } = {},
): string {
  if (!opts.enabled) {
    if (id === "share-below-image") {
      // Architectural reservation only — no visible ad chrome on UGC by default
      return `<!-- ad slot ${id} reserved (disabled) -->`;
    }
    return "";
  }
  return `<aside class="ad-slot" data-ad-slot="${esc(id)}" aria-hidden="true"></aside>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
