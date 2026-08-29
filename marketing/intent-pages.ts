import type { LandingCopy } from "./types";

/** English-only SEO intent landings (not in PAGE_IDS / hreflang set). */
export const INTENT_PAGE_IDS = [
  "screenshot-to-link",
  "image-to-url",
  "anonymous-image-hosting",
  "expiring-image-link",
] as const;

export type IntentPageId = (typeof INTENT_PAGE_IDS)[number];

export const INTENT_PAGE_PATHS: Record<IntentPageId, string> = {
  "screenshot-to-link": "/screenshot-to-link",
  "image-to-url": "/image-to-url",
  "anonymous-image-hosting": "/anonymous-image-hosting",
  "expiring-image-link": "/expiring-image-link",
};

export const INTENT_PAGES: Record<IntentPageId, LandingCopy> = {
  "screenshot-to-link": {
    title: "Screenshot to Link — Temporary Share URL | dropimg.io",
    description:
      "Turn a screenshot into a shareable link in seconds. Paste or drop an image. No account. Links expire after 24 hours.",
    ogTitle: "Screenshot to link | dropimg.io",
    ogDescription:
      "Paste a screenshot, get a temporary URL. No signup. Expires in 24 hours.",
    twitterTitle: "Screenshot to link",
    twitterDescription:
      "Paste or drop a screenshot → temporary shareable link. No account.",
    h1: "Screenshot to link",
    lede: "Paste or drop a screenshot and get a short shareable URL. No account. The link expires after 24 hours.",
    blocks: [
      {
        type: "h2",
        text: "How it works",
      },
      {
        type: "ol",
        items: [
          "Paste (⌘V / Ctrl+V), drop a file, or choose an image.",
          "Upload starts immediately — you get a short dropimg.io link.",
          "Copy and share. The image is removed automatically after 24 hours.",
        ],
      },
      {
        type: "h2",
        text: "Why a temporary link",
      },
      {
        type: "p",
        text: "Screenshots for chats, tickets, and quick feedback rarely need to live forever. A short-lived link keeps sharing simple without accounts or permanent galleries.",
      },
      {
        type: "h2",
        text: "Formats and limits",
      },
      {
        type: "ul",
        items: [
          "PNG, JPEG, WebP, and GIF up to 10 MB.",
          "Metadata is stripped when supported.",
          "You can delete early with the one-time delete control after upload.",
        ],
      },
    ],
  },
  "image-to-url": {
    title: "Image to URL — Get a Temporary Link | dropimg.io",
    description:
      "Convert an image to a URL instantly. Drop or paste a file, copy the link, share. No account. Expires in 24 hours.",
    ogTitle: "Image to URL | dropimg.io",
    ogDescription:
      "Drop an image, get a temporary URL. No signup required.",
    twitterTitle: "Image to URL",
    twitterDescription:
      "Upload an image and copy a temporary share link. Expires in 24 hours.",
    h1: "Image to URL",
    lede: "Drop or paste an image and copy a temporary URL. Built for quick sharing — not permanent hosting.",
    blocks: [
      {
        type: "h2",
        text: "From file to link",
      },
      {
        type: "p",
        text: "Use the uploader above. When the upload finishes, the share URL is ready to copy. Open it anywhere — chat, email, or a ticket.",
      },
      {
        type: "h2",
        text: "What you get",
      },
      {
        type: "ul",
        items: [
          "A short public page for the image.",
          "A direct image URL under /i/… for embedding where allowed.",
          "Automatic expiry after 24 hours.",
        ],
      },
      {
        type: "h2",
        text: "Not a CDN or gallery",
      },
      {
        type: "p",
        text: "dropimg.io is for temporary shares. There is no public gallery, no accounts, and no permanent storage option.",
      },
    ],
  },
  "anonymous-image-hosting": {
    title: "Anonymous Image Hosting (Temporary) | dropimg.io",
    description:
      "Anonymous temporary image hosting with no account. Paste or upload, share a link, auto-delete in 24 hours.",
    ogTitle: "Anonymous temporary image hosting | dropimg.io",
    ogDescription:
      "No account required. Temporary links that expire in 24 hours.",
    twitterTitle: "Anonymous image hosting",
    twitterDescription:
      "Upload without an account. Links expire after 24 hours.",
    h1: "Anonymous temporary image hosting",
    lede: "Share an image without creating an account. Links are temporary and expire after 24 hours.",
    blocks: [
      {
        type: "h2",
        text: "No signup",
      },
      {
        type: "p",
        text: "Upload from the page above. We do not offer user accounts, profiles, or permanent libraries. IP addresses are hashed for abuse-rate limits, not for identity.",
      },
      {
        type: "h2",
        text: "Still accountable",
      },
      {
        type: "p",
        text: "Anonymous does not mean unmoderated. Abuse can be reported at /abuse. Illegal content is removed. See the Privacy Policy and Terms for details.",
      },
      {
        type: "h2",
        text: "24-hour default",
      },
      {
        type: "ul",
        items: [
          "Every upload expires after 24 hours.",
          "You can delete sooner with the delete token from your upload session.",
          "There is no permanent or password-protected storage.",
        ],
      },
    ],
  },
  "expiring-image-link": {
    title: "Expiring Image Link — 24-Hour Share URL | dropimg.io",
    description:
      "Create an expiring image link in seconds. Paste a screenshot or drop a file. Auto-deletes after 24 hours. No account.",
    ogTitle: "Expiring image link | dropimg.io",
    ogDescription:
      "Temporary image URLs that expire in 24 hours. Paste, drop, share.",
    twitterTitle: "Expiring image link",
    twitterDescription:
      "Share an image with a link that disappears after 24 hours.",
    h1: "Expiring image link",
    lede: "Get a shareable image URL that automatically expires after 24 hours. Paste or drop to start.",
    blocks: [
      {
        type: "h2",
        text: "Built to expire",
      },
      {
        type: "p",
        text: "Every dropimg.io link has a fixed 24-hour lifetime. When time is up, the image is removed from storage and the URL stops serving.",
      },
      {
        type: "h2",
        text: "Good for",
      },
      {
        type: "ul",
        items: [
          "Quick screenshots in support chats",
          "One-off mockups and previews",
          "Anything you do not want hosted forever",
        ],
      },
      {
        type: "h2",
        text: "Delete early",
      },
      {
        type: "p",
        text: "After upload, use Delete on this device to remove the image before expiry. Recipients will see that the link is gone.",
      },
    ],
  },
};

export function intentPageUrl(id: IntentPageId): string {
  return `https://dropimg.io${INTENT_PAGE_PATHS[id]}`;
}

export function allIntentUrls(): string[] {
  return INTENT_PAGE_IDS.map(intentPageUrl);
}
