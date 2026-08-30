import type { LandingCopy } from "./types";

/**
 * The extension page leads with a product hero and keeps the reference
 * documentation below it, so `heroTitle` / `heroTagline` drive the visible
 * headline while `h1`'s keyword-carrying copy stays on the page as the lede.
 */
type ExtensionCopy = LandingCopy & {
  heroKicker: string;
  heroTitle: string;
  heroTagline: string;
  heroFacts: [string, string, string];
  detailsHeading: string;
  skip: string;
};

/** English-only acquisition page for the Chrome/Edge extension. */
export const EXTENSION_PAGE: ExtensionCopy = {
  title: "Chrome & Edge Screenshot Extension | dropimg.io",
  description:
    "Capture the visible tab or a region — get a temporary dropimg.io link. Chrome and Edge. English, Spanish, Portuguese, German. No account.",
  ogTitle: "Screenshot to link — Chrome & Edge extension | dropimg.io",
  ogDescription:
    "Visible or region capture. Upload to dropimg.io, copy a temporary share link. Alt+Shift+D for silent capture.",
  twitterTitle: "dropimg.io browser extension",
  twitterDescription:
    "Screenshot → temporary link. Visible or region. No account. Expires in 24 hours.",
  h1: "Screenshot to link, from your toolbar",
  lede: "Capture what you see or draw a region — then get a temporary shareable link. No account. Expires in 24 hours. Available in English, Spanish, Portuguese (Brazil), and German.",
  heroKicker: "Browser extension",
  heroTitle: "DropIMG for your browser",
  heroTagline: "Capture. Upload. Link copied.",
  heroFacts: [
    "Chrome and Edge",
    "Alt+Shift+D for a silent capture",
    "Links expire in 24 hours",
  ],
  detailsHeading: "Details",
  skip: "Skip to details",
  blocks: [
    {
      type: "h2",
      text: "What it does",
    },
    {
      type: "ol",
      items: [
        "Click the toolbar icon, choose Visible or Region, then Capture.",
        "Press Alt+Shift+D anytime for a silent visible capture — link copied, toast on the page.",
        "Uploads go to dropimg.io; the share URL is copied automatically.",
        "Recent drops (last 10) stay on your device — copy, open, or delete.",
      ],
    },
    {
      type: "h2",
      text: "Capture modes",
    },
    {
      type: "ul",
      items: [
        "Visible — what you see in the tab.",
        "Region — draw a rectangle on the page, then upload the crop.",
      ],
    },
    {
      type: "h2",
      text: "Install",
    },
    {
      type: "p",
      text: "Chrome Web Store and Microsoft Edge Add-ons listings will appear here once published. Until then, developers can load the unpacked build from the open-source repository (see the extension README).",
    },
    {
      type: "p",
      text: "Store links: coming soon — same Manifest V3 package for Chrome and Edge.",
    },
    {
      type: "h2",
      text: "Permissions",
    },
    {
      type: "ul",
      items: [
        "activeTab — capture the tab you invoke on.",
        "scripting — temporary region-selection overlay on that tab.",
        "storage — local recent drops (not synced to an account).",
        "offscreen + notifications — clipboard write and fallback notice for silent / region completion.",
        "Host access to dropimg.io — upload screenshots to our API.",
      ],
    },
    {
      type: "p",
      text: "We do not sell data or require an account. Uploads follow the same rules as the website: metadata stripping when supported, 24-hour expiry. Details are in the Privacy Policy.",
    },
    {
      type: "h2",
      text: "What it is not",
    },
    {
      type: "p",
      text: "No annotation tools, OCR, AI analysis, accounts, or cloud sync. One job: capture → link.",
    },
  ],
};

export const EXTENSION_PATH = "/browser-extension";
export const EXTENSION_URL = "https://dropimg.io/browser-extension";
