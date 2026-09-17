import type { FaqItem, PageSeo } from "./types";

export const WEB_ASSETS_PATH = "/web-assets";
export const WEB_ASSETS_URL = "https://dropimg.io/web-assets";

export const WEB_ASSETS_PAGE: PageSeo & {
  skip: string;
  kicker: string;
  h1: string;
  lede: string;
  createCta: string;
  createCtaSoon: string;
  connectCta: string;
  dropCta: string;
  useHeading: string;
  useBody: string;
  pathHeading: string;
  pathBody: string;
  pathExample: string;
  versionHeading: string;
  versionBody: string;
  formatsHeading: string;
  formatsSupported: string[];
  formatsUnsupportedHeading: string;
  formatsUnsupported: string[];
  agentHeading: string;
  agentBody: string;
  restHeading: string;
  restBody: string;
  mcpHeading: string;
  mcpBody: string;
  keysHeading: string;
  keysBody: string;
  publicHeading: string;
  publicBody: string;
  vsHeading: string;
  faqHeading: string;
  faqs: [FaqItem, FaqItem, FaqItem];
} = {
  title: "Web Assets for AI-built sites — stable URLs | dropimg.io",
  description:
    "Permanent web assets for AI coding agents: images, sanitized SVG, ICO, and WOFF/WOFF2. Stable /m/org/project/path aliases. Replace the file without changing application code.",
  ogTitle: "Web Assets — permanent URLs for AI-built sites",
  ogDescription:
    "Stable semantic URLs for logos, heroes, favicons, and web fonts. Built for Cursor, Claude Code, Codex, and MCP.",
  twitterTitle: "Permanent web assets for coding agents",
  twitterDescription:
    "Replace branding/logo without touching the URL. JPEG, PNG, WebP, GIF, AVIF, SVG, ICO, WOFF, WOFF2.",
  skip: "Skip to Web Assets",
  kicker: "DropIMG Media",
  h1: "Permanent web assets for applications",
  lede: "Your AI builds the site. DropIMG hosts the files the site actually serves — with role-based URLs that do not change when the bytes do.",
  createCta: "Create a Web Assets project",
  createCtaSoon: "Web Assets launching soon",
  connectCta: "Connect your agent",
  dropCta: "Try a temporary Drop",
  useHeading: "What Web Assets are for",
  useBody:
    "Logos, homepage heroes, favicons, product shots, and web fonts that belong in an app. Not bug screenshots, not chat images — those are Drops.",
  pathHeading: "Semantic paths",
  pathBody:
    "Aliases are extensionless and named for the role they play. The application references the path, not a version UUID.",
  pathExample: "/m/acme/site/branding/logo",
  versionHeading: "Immutable versions, stable aliases",
  versionBody:
    "Each replace writes a new object and version row. The public URL stays the same. MIME may change: an SVG logo can become a PNG.",
  formatsHeading: "Supported formats",
  formatsSupported: [
    "Raster: JPEG, PNG, WebP, GIF, AVIF",
    "Vector: sanitized SVG",
    "Icons: ICO",
    "Fonts: WOFF, WOFF2",
  ],
  formatsUnsupportedHeading: "Not a generic file host",
  formatsUnsupported: [
    "PDF, video, audio",
    "ZIP and other archives",
    "HTML, JavaScript, CSS, PHP, source",
    "Executables",
    "TTF, OTF, EOT",
    "Arbitrary blobs",
  ],
  agentHeading: "Agent workflow",
  agentBody:
    "The agent finds the project, starts an upload intent, POSTs bytes to a short-lived HTTP URL, and uses the returned /m/… alias in your app. Temporary screenshots stay on upload_image.",
  restHeading: "REST",
  restBody:
    "Authenticated /api/v1/media for orgs, projects, keys, assets, and upload intents. Same write path as MCP. OpenAPI at /openapi/v1.yaml.",
  mcpHeading: "MCP",
  mcpBody:
    "One server at https://dropimg.io/mcp. Media tools list, create, get, upload, and replace Web Assets. Bytes never travel in JSON-RPC.",
  keysHeading: "Project keys",
  keysBody:
    "Project-scoped dropimg_pk_… credentials. A key cannot create projects. Humans sign in; agents use OAuth or a project key.",
  publicHeading: "Public delivery",
  publicBody:
    "GET /m/{org}/{project}/{path} is public. CORS is open so @font-face and <img> work from any origin. Knowledge of the URL is sufficient for access. This is not confidential storage.",
  vsHeading: "Drops vs Web Assets",
  faqHeading: "Web Assets questions",
  faqs: [
    {
      q: "Is this live in production?",
      a: "Sign in and create a Free Web Assets project in Media. Developer and Pro checkout from the pricing page via PayPal. Existing public /m/… URLs keep serving if new uploads have to pause.",
    },
    {
      q: "Can I host a PDF or a video?",
      a: "No. DropIMG Media is focused Web Asset infrastructure, not S3. Use Drops for a temporary screenshot; use Web Assets for the files a website serves.",
    },
    {
      q: "Do I pay per MCP call?",
      a: "No. Plans cover projects, storage, and asset deliveries. There is no per-MCP-call fee and no bandwidth surcharge on top of the plan. Fair-use and plan limits still apply.",
    },
  ],
};
