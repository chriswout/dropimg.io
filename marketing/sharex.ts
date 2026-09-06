import type { LandingCopy } from "./types";

type SharexCopy = LandingCopy & {
  heroKicker: string;
  heroTitle: string;
  heroTagline: string;
  heroFacts: [string, string, string];
  downloadAnon: string;
  downloadHref: string;
  accountCta: string;
  accountHref: string;
  detailsHeading: string;
  skip: string;
};

export const SHAREX_PATH = "/sharex";
export const SHAREX_URL = "https://dropimg.io/sharex";
export const SHAREX_CONFIG_PATH = "/sharex/dropimg.sxcu";

/** English-only setup page. The .sxcu is language-agnostic. */
export const SHAREX_PAGE: SharexCopy = {
  title: "ShareX Screenshot Uploader | dropimg.io",
  description:
    "Send ShareX screenshots to dropimg.io. Double-click the config, get a temporary share link. No account required.",
  ogTitle: "ShareX → temporary link | dropimg.io",
  ogDescription:
    "Import a .sxcu, capture as usual, get a dropimg.io link. Anonymous or attached to your account.",
  twitterTitle: "dropimg.io for ShareX",
  twitterDescription:
    "Screenshot → temporary link from ShareX. No account required.",
  h1: "Screenshot to link, from ShareX",
  lede: "Import a one-file config. ShareX keeps capturing the way it already does. dropimg.io returns a temporary link — 7 days by default, or 1 hour / 24 hours / 7 days if you set the expiry field.",
  heroKicker: "ShareX",
  heroTitle: "DropIMG for ShareX",
  heroTagline: "Capture. Upload. Link copied.",
  heroFacts: [
    "Windows. ShareX 15+",
    "Anonymous config — no account",
    "Account config attaches uploads to My drops",
  ],
  downloadAnon: "Download anonymous config",
  downloadHref: SHAREX_CONFIG_PATH,
  accountCta: "Create an account config",
  accountHref: "/app/integrations",
  detailsHeading: "Setup",
  skip: "Skip to setup",
  blocks: [
    {
      type: "h2",
      text: "Anonymous (no account)",
    },
    {
      type: "ol",
      items: [
        "Download dropimg.sxcu and double-click it, or Import it in ShareX → Destinations → Custom uploader.",
        "Set dropimg.io as the image uploader destination.",
        "Capture as usual. The share URL is copied. Links default to 7 days and stay at 10 MB.",
      ],
    },
    {
      type: "h2",
      text: "With a DropIMG account",
    },
    {
      type: "ol",
      items: [
        "Sign in, open Integrations, and click Create ShareX config.",
        "Download dropimg-sharex.sxcu immediately — the token is shown once.",
        "Import that file. Uploads appear in My drops and use your plan's expiry options.",
      ],
    },
    {
      type: "h2",
      text: "Expiry field",
    },
    {
      type: "p",
      text: "The public config sends expiry=7d. Change it to 1h or 24h for a shorter link. Pro account configs also accept 30d and 90d. Image passwords are not in the ShareX config.",
    },
    {
      type: "h2",
      text: "If you lose the file",
    },
    {
      type: "p",
      text: "Revoke the old token on Integrations and create a new config. DropIMG cannot regenerate a previous token or .sxcu.",
    },
  ],
};
