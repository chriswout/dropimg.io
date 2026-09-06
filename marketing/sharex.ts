import type { FaqItem, LandingCopy } from "./types";

type SharexCopy = LandingCopy & {
  heroKicker: string;
  heroTitle: string;
  heroTagline: string;
  heroFacts: [string, string, string];
  downloadAnon: string;
  downloadHref: string;
  accountCta: string;
  accountHref: string;
  githubCta: string;
  githubHref: string;
  detailsHeading: string;
  skip: string;
  faqHeading: string;
  faqs: [FaqItem, FaqItem, FaqItem, FaqItem];
  schemaHowtoName: string;
  schemaHowtoDescription: string;
};

export const SHAREX_PATH = "/sharex";
export const SHAREX_URL = "https://dropimg.io/sharex";
export const SHAREX_CONFIG_PATH = "/sharex/dropimg.sxcu";
export const SHAREX_GITHUB_URL = "https://github.com/chriswout/dropimg-sharex";

/** English-only setup page. The .sxcu is language-agnostic. */
export const SHAREX_PAGE: SharexCopy = {
  title: "ShareX Custom Uploader — Free Temporary Image Host | dropimg.io",
  description:
    "Free ShareX image uploader. Import the custom uploader .sxcu, capture a screenshot, get a temporary URL. No account. Links expire in 7 days.",
  ogTitle: "ShareX custom uploader | dropimg.io",
  ogDescription:
    "Upload a ShareX screenshot to a URL that expires. Anonymous config or attach uploads to your account.",
  twitterTitle: "ShareX image uploader for dropimg.io",
  twitterDescription:
    "Free temporary ShareX image host. Double-click the .sxcu, capture as usual, link copied.",
  h1: "ShareX image uploader",
  lede: "dropimg.io is a free ShareX image host: import one custom uploader file, keep capturing the way you already do, and get a temporary URL. No account required. The public config is anonymous; an account config attaches uploads to My drops.",
  heroKicker: "ShareX custom uploader",
  heroTitle: "ShareX image uploader",
  heroTagline: "Upload a screenshot to a URL",
  heroFacts: [
    "One-click .sxcu — ShareX 15+",
    "Anonymous. No account.",
    "Temporary links — 7 days by default",
  ],
  downloadAnon: "Download anonymous config",
  downloadHref: SHAREX_CONFIG_PATH,
  accountCta: "Create an account config",
  accountHref: "/app/integrations",
  githubCta: "Custom uploader on GitHub",
  githubHref: SHAREX_GITHUB_URL,
  detailsHeading: "Setup",
  skip: "Skip to setup",
  schemaHowtoName: "Add dropimg.io as a ShareX custom uploader",
  schemaHowtoDescription:
    "Download the dropimg.sxcu custom uploader, import it in ShareX, and upload a screenshot to a temporary URL.",
  faqHeading: "ShareX questions",
  faqs: [
    {
      q: "Is this a free ShareX image host?",
      a: "Yes. The anonymous custom uploader needs no account. Screenshots upload to dropimg.io and return a temporary URL. Max 10 MB. SVG is not accepted.",
    },
    {
      q: "How do I add the ShareX custom uploader?",
      a: "Download dropimg.sxcu and double-click it. ShareX imports the destination automatically. Or Import it from Destinations → Custom uploader, then set dropimg.io as the image uploader.",
    },
    {
      q: "Do I need an account to upload a ShareX screenshot to a URL?",
      a: "No. The public .sxcu is anonymous. Sign in only if you want uploads in My drops, or longer Pro expiries (30 or 90 days).",
    },
    {
      q: "How long do temporary ShareX links last?",
      a: "The public config sends expiry=7d. Change the field to 1h or 24h for a shorter link. Account configs can use 30d and 90d on Pro. Images are not kept forever.",
    },
  ],
  blocks: [
    {
      type: "h2",
      text: "One-click install",
    },
    {
      type: "ol",
      items: [
        "Download dropimg.sxcu and double-click it. ShareX activates the custom uploader automatically. You can also Import it under Destinations → Custom uploader.",
        "Set dropimg.io as the image uploader destination.",
        "Capture as usual. ShareX uploads the screenshot and copies the temporary URL.",
      ],
    },
    {
      type: "h2",
      text: "Anonymous vs account",
    },
    {
      type: "p",
      text: "Anonymous: the public .sxcu. No token, no sign-in, 10 MB, 7-day default. Uploads are not listed in an account. This is the free ShareX image host most people want.",
    },
    {
      type: "p",
      text: "Account: sign in, open Integrations, and click Create ShareX config. Download dropimg-sharex.sxcu immediately — the token is shown once. Those uploads appear in My drops and follow your plan’s expiry options. Never commit that file.",
    },
    {
      type: "h2",
      text: "Privacy and expiry",
    },
    {
      type: "p",
      text: "dropimg.io is a temporary ShareX uploader, not a permanent archive. Links default to 7 days and then go away. The public config can send expiry=1h, 24h, or 7d. Pro account configs also accept 30d and 90d. Image passwords are not in the ShareX config. See the privacy policy for what is stored.",
    },
    {
      type: "h2",
      text: "If you lose an account config",
    },
    {
      type: "p",
      text: "Revoke the old token on Integrations and create a new config. DropIMG cannot regenerate a previous token or .sxcu.",
    },
    {
      type: "h2",
      text: "Source on GitHub",
    },
    {
      type: "p",
      text: "The anonymous custom uploader lives at github.com/chriswout/dropimg-sharex — .sxcu, screenshots, and the same install steps. ShareX users who browse GitHub can clone or download the file from there. This page is the canonical setup URL.",
    },
  ],
};
