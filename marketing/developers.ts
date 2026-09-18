import type { FaqItem, LandingCopy } from "./types";
import { WEB_ASSETS_PLANS } from "../src/lib/web-assets-plans";
import {
  FREE_PROGRAMMATIC_DAILY_BYTES,
  FREE_PROGRAMMATIC_DAILY_UPLOADS,
  PRO_PROGRAMMATIC_DAILY_BYTES,
  PRO_PROGRAMMATIC_DAILY_UPLOADS,
} from "../src/lib/programmatic-quota";

export const DEVELOPERS_PATH = "/developers";
export const DEVELOPERS_URL = "https://dropimg.io/developers";
export const OPENAPI_PATH = "/openapi/v1.yaml";
export const MCP_ENDPOINT = "https://dropimg.io/mcp";

export const DEVELOPERS_ONBOARDING = {
  heading: "5-minute quickstart",
  lede: "Sign in, create a Web Assets project, connect MCP, upload the first file, and paste the returned URL into the app. Temporary screenshot URLs still use the Drop API below.",
  stepsHeading: "Ideal flow",
  steps: [
    "Create your DropIMG account",
    "Create a Web Assets project — website",
    "Connect MCP at https://dropimg.io/mcp",
    "Ask the agent: Upload this logo as branding/logo.",
    "Use the returned stable URL in the app",
  ] as const,
  launchNote: "",
  cursorHeading: "Cursor",
  cursorBody:
    "Add the DropIMG MCP server (https://dropimg.io/mcp). Cursor opens OAuth after install. Ask the agent to create a project, then upload branding/logo as a Web Asset. Do not invent a /m/… URL — use the JSON url after the HTTP upload.",
  cursorCta: "Add to Cursor",
  claudeHeading: "Claude Code",
  claudeBody:
    "Register https://dropimg.io/mcp as a remote MCP server. After OAuth, the same tools are available: list_media_projects, upload_media_asset, replace_media_asset. Temporary screenshots stay on upload_image.",
  codexHeading: "Codex",
  codexBody:
    "Point Codex at https://dropimg.io/mcp. Use an account OAuth session or a project key (dropimg_pk_…) for an existing project. Project keys cannot create projects.",
  mcpHeading: "Generic MCP",
  mcpBody:
    "Canonical endpoint: https://dropimg.io/mcp. Streamable HTTP. One server for Drops and Web Assets — not a second MCP process.",
  mcpEndpoint: MCP_ENDPOINT,
};

type DevelopersCopy = LandingCopy & {
  heroKicker: string;
  heroTitle: string;
  heroTagline: string;
  heroFacts: [string, string, string];
  skip: string;
  detailsHeading: string;
  curlLabel: string;
  curl: string;
  responseHeading: string;
  responseJson: string;
  examplesHeading: string;
  faqHeading: string;
  faqs: [FaqItem, FaqItem, FaqItem, FaqItem, FaqItem];
  accountCta: string;
  accountHref: string;
  specCta: string;
  specHref: string;
  primaryCta: string;
  secondaryCta: string;
};

export const DEVELOPERS_PAGE: DevelopersCopy = {
  title: "Developer Docs — Web Assets, MCP & Image API | DropIMG",
  description:
    "Integrate DropIMG Web Assets with MCP and REST. Give AI coding agents stable URLs for images, SVGs, icons and web fonts. Temporary Drops API included.",
  ogTitle: "Developer Docs — Web Assets, MCP & Image API | DropIMG",
  ogDescription:
    "Connect Cursor, Claude Code, Codex, or any MCP client. Upload and replace images, SVGs, icons, and web fonts without changing the URL.",
  twitterTitle: "DropIMG developer docs — Web Assets, MCP, REST",
  twitterDescription:
    "Stable /m/… URLs for AI-built apps. MCP OAuth. REST for scripts. Temporary Drops API included.",
  h1: "Web assets your coding agent can manage.",
  lede: "Connect Cursor, Claude Code, Codex, or any MCP client to DropIMG. Upload and replace images, SVGs, favicons, and web fonts without changing the URL in your application.",
  heroKicker: "Developers",
  heroTitle: "Web assets your coding agent can manage.",
  heroTagline: "MCP + REST for Web Assets. Temporary Drops when you need a short-lived link.",
  heroFacts: [
    "OAuth for Cursor and MCP clients",
    "Stable /m/… aliases",
    "Drops API for screenshots",
  ],
  skip: "Skip to quickstart",
  detailsHeading: "REST API",
  curlLabel: "cURL",
  curl: `curl -X POST https://dropimg.io/api/v1/media/orgs/$ORG_ID/projects \\
  -H "Authorization: Bearer $DROPIMG_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"website","name":"website"}'`,
  responseHeading: "Response",
  responseJson: `{
  "id": "abc123xy",
  "url": "https://dropimg.io/abc123xy",
  "image_url": "https://dropimg.io/i/abc123xy",
  "created_at": "2026-09-07T12:00:00.000Z",
  "expires_at": "2026-09-14T12:00:00.000Z"
}`,
  examplesHeading: "Other languages",
  faqHeading: "API questions",
  faqs: [
    {
      q: "Is this a Web Assets API?",
      a: "Yes. The primary product is permanent Web Assets with stable /m/… URLs. The same /mcp endpoint also uploads temporary Drops. Drops expire; Web Assets stay until you replace or delete them.",
    },
    {
      q: "Do I need an account?",
      a: "Yes for MCP OAuth, REST, and Web Assets projects. Create an account API key (dropimg_api_…) on Integrations, or a project key (dropimg_pk_…) for one project. Anonymous uploads stay on the website and ShareX — not on the public REST API.",
    },
    {
      q: "What can a project key do?",
      a: "A dropimg_pk_… key is scoped to one project. It can list, upload, and replace assets in that project. Project keys cannot create projects.",
    },
    {
      q: "Where is the OpenAPI spec?",
      a: "https://dropimg.io/openapi/v1.yaml — Drops images plus Web Assets (orgs, projects, keys, assets, intents). Public /m/… aliases are not confidential.",
    },
    {
      q: "Do Web Assets and Drops share quotas?",
      a: "No. Web Assets plans cap projects, storage, keys, and monthly deliveries. Drops API/MCP share a separate daily bucket: Free 20 uploads / 50 MB, Drops Pro 100 / 500 MB. Site Drop uploads are not the same meter.",
    },
  ],
  accountCta: "Create an API key",
  accountHref: "/app/integrations",
  specCta: "OpenAPI spec",
  specHref: OPENAPI_PATH,
  primaryCta: "Connect with MCP",
  secondaryCta: "View REST API",
  blocks: [],
};

export const DEVELOPERS_CARDS = [
  {
    id: "mcp",
    kicker: "Recommended",
    title: "MCP",
    body: "Best for AI coding agents",
    meta: MCP_ENDPOINT,
    cta: "Connect MCP",
    href: "#mcp",
  },
  {
    id: "rest",
    kicker: "REST",
    title: "Web Assets API",
    body: "Best for scripts and backend workflows",
    meta: "/api/v1/media",
    cta: "View examples",
    href: "#rest",
  },
  {
    id: "drops",
    kicker: "Drops",
    title: "Temporary Drops API",
    body: "Best for screenshots and short-lived links",
    meta: "/api/v1/images",
    cta: "View Drops API",
    href: "#drops-api",
  },
] as const;

export const DEVELOPERS_QUICKSTART = [
  {
    n: "1",
    title: "Sign in",
    body: "Create your DropIMG account.",
  },
  {
    n: "2",
    title: "Create a Web Assets project",
    body: "Use a slug like website.",
  },
  {
    n: "3",
    title: "Connect MCP",
    body: MCP_ENDPOINT,
  },
  {
    n: "4",
    title: "Upload an asset",
    body: "Upload this logo as branding/logo.",
  },
  {
    n: "5",
    title: "Use the stable URL",
    body: "https://dropimg.io/m/acme/site/branding/logo",
  },
] as const;

export const MCP_CONFIG = `{
  "mcpServers": {
    "dropimg": {
      "url": "https://dropimg.io/mcp"
    }
  }
}`;

export const MCP_WORKFLOW = `You:
Replace the homepage hero.

Agent:
✓ Found homepage/hero
✓ Requested replacement upload
✓ Uploaded new image
✓ Stable URL unchanged

https://dropimg.io/m/acme/site/homepage/hero`;

export const MCP_TOOL_GROUPS = [
  {
    title: "Projects",
    tools: ["list_media_projects", "create_media_project"],
  },
  {
    title: "Assets",
    tools: ["list_media_assets", "get_media_asset"],
  },
  {
    title: "Upload",
    tools: ["upload_media_asset", "replace_media_asset"],
  },
  {
    title: "Temporary Drops",
    tools: ["upload_image", "get_image", "list_images", "delete_image"],
  },
] as const;

export const AUTH_CARDS = [
  {
    title: "OAuth",
    prefix: "MCP session",
    best: "Cursor, MCP clients, humans",
    note: "Cursor and compatible MCP clients authenticate through OAuth.",
  },
  {
    title: "Account API key",
    prefix: "dropimg_api_",
    best: "Scripts, backend automation, multiple projects",
    note: "Drops REST and MCP across projects. Minted once on Integrations.",
  },
  {
    title: "Project key",
    prefix: "dropimg_pk_",
    best: "CI/CD, one project, scoped automation",
    note: "Web Assets REST for that project. Project keys cannot create projects.",
  },
] as const;

const gb = (bytes: number) => `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
const deliveries = (n: number) =>
  n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1_000}K`;

export const WEB_ASSETS_LIMIT_ROWS = (
  ["free", "developer", "pro"] as const
).map((id) => {
  const plan = WEB_ASSETS_PLANS[id];
  const name = id === "free" ? "Free" : id === "developer" ? "Developer" : "Pro";
  return {
    name,
    projects: String(plan.projectLimit),
    storage: gb(plan.storageBytesLimit),
    deliveries: `${deliveries(plan.deliveryLimitMonthly)} / month`,
    keys: String(plan.projectKeyLimit),
    file: "10 MB",
  };
});

export const DROPS_LIMIT_ROWS = [
  {
    name: "Drops Free",
    file: "10 MB",
    expiry: "1h · 24h · 7d · 30d",
    api: `${FREE_PROGRAMMATIC_DAILY_UPLOADS} uploads / ${FREE_PROGRAMMATIC_DAILY_BYTES / (1024 * 1024)} MB per day`,
  },
  {
    name: "Drops Pro",
    file: "10 MB (50 MB when enabled)",
    expiry: "plus 90d · 180d",
    api: `${PRO_PROGRAMMATIC_DAILY_UPLOADS} uploads / ${PRO_PROGRAMMATIC_DAILY_BYTES / (1024 * 1024)} MB per day`,
  },
];

export const WEB_ASSET_FORMATS = [
  "JPEG",
  "PNG",
  "WebP",
  "GIF",
  "AVIF",
  "SVG",
  "ICO",
  "WOFF",
  "WOFF2",
];

export const DROP_FORMATS = ["PNG", "JPEG", "WebP", "GIF"];

export const UNSUPPORTED_FORMATS = [
  "PDF",
  "Video",
  "Audio",
  "ZIP",
  "HTML",
  "JavaScript",
  "CSS",
  "Executables",
  "TTF",
  "OTF",
  "EOT",
];

export const ERROR_CODES = [
  { code: "unauthorized", meaning: "Missing or invalid Bearer token." },
  { code: "forbidden", meaning: "Key is missing the required scope, or a project key tried to create a project." },
  { code: "quota_exceeded", meaning: "Plan limit reached — projects, storage, keys, or Drop API/MCP daily bucket." },
  { code: "unsupported_type", meaning: "Bytes are not an accepted Web Asset or Drop type." },
  { code: "not_found", meaning: "Org, project, asset, Drop, or intent does not exist." },
] as const;

export const ERROR_EXAMPLE = `{
  "error": "Plan allows 3 projects",
  "code": "quota_exceeded"
}`;

export const REST_CREATE_ORG = `curl -X POST https://dropimg.io/api/v1/media/orgs`;

export const REST_CREATE_PROJECT = `curl -X POST https://dropimg.io/api/v1/media/orgs/$ORG_ID/projects \\
  -H "Content-Type: application/json" \\
  -d '{
    "slug": "website",
    "name": "website"
  }'`;

export const REST_CREATE_INTENT = `curl -X POST https://dropimg.io/api/v1/media/projects/$PROJECT_ID/intents \\
  -H "Authorization: Bearer $DROPIMG_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operation": "create",
    "path": "branding/logo"
  }'`;

export const REST_UPLOAD_BYTES = `curl -X POST "$UPLOAD_URL" \\
  -H "Authorization: Bearer $INTENT_TOKEN" \\
  --data-binary @logo.png`;

export const REST_REPLACE_INTENT = `curl -X POST https://dropimg.io/api/v1/media/projects/$PROJECT_ID/intents \\
  -H "Authorization: Bearer $DROPIMG_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operation": "replace",
    "asset_id": "$ASSET_ID"
  }'`;

export const DROPS_CURL = `curl -X POST https://dropimg.io/api/v1/images \\
  -H "Authorization: Bearer $DROPIMG_API_KEY" \\
  -F file=@screenshot.png \\
  -F expiry=7d`;

export const DEVELOPERS_EXAMPLES = {
  js: `const intentRes = await fetch(
  \`https://dropimg.io/api/v1/media/projects/\${process.env.DROPIMG_PROJECT_ID}/intents\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.DROPIMG_PROJECT_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operation: "create", path: "branding/logo" }),
  },
);
const { intent } = await intentRes.json();

const uploadRes = await fetch(intent.uploadUrl, {
  method: "POST",
  headers: intent.headers,
  body: logoBytes,
});
const { asset } = await uploadRes.json();
console.log(asset.url);`,
  python: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.environ['DROPIMG_PROJECT_KEY']}",
    "Content-Type": "application/json",
}

intent = requests.post(
    f"https://dropimg.io/api/v1/media/projects/{os.environ['DROPIMG_PROJECT_ID']}/intents",
    headers=headers,
    json={"operation": "create", "path": "branding/logo"},
).json()["intent"]

asset = requests.post(
    intent["uploadUrl"],
    headers=intent["headers"],
    data=open("logo.png", "rb"),
).json()["asset"]
print(asset["url"])`,
  dropsJs: `const form = new FormData();
form.append("file", file);
form.append("expiry", "7d");

const res = await fetch("https://dropimg.io/api/v1/images", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.DROPIMG_API_KEY}\` },
  body: form,
});
const image = await res.json();
console.log(image.url);`,
  dropsPython: `import os
import requests

r = requests.post(
    "https://dropimg.io/api/v1/images",
    headers={"Authorization": f"Bearer {os.environ['DROPIMG_API_KEY']}"},
    files={"file": open("screenshot.png", "rb")},
    data={"expiry": "7d"},
)
print(r.json()["url"])`,
};
