import type { FaqItem, LandingCopy } from "./types";

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
};

export const DEVELOPERS_PATH = "/developers";
export const DEVELOPERS_URL = "https://dropimg.io/developers";
export const OPENAPI_PATH = "/openapi/v1.yaml";

export const DEVELOPERS_PAGE: DevelopersCopy = {
  title: "Temporary Image Upload API — Image Hosting API | dropimg.io",
  description:
    "Temporary image upload API. POST an image, get a URL. Authenticated REST for scripts: upload, list, and delete. No albums. No permanent archive.",
  ogTitle: "Image hosting API | dropimg.io",
  ogDescription:
    "Image in. URL out. A temporary image upload API with Bearer keys. Free and Pro use the same write path.",
  twitterTitle: "Temporary image upload API — dropimg.io",
  twitterDescription:
    "POST /api/v1/images. Get a URL. Links expire. Bearer API key required.",
  h1: "Image in. URL out.",
  lede: "A temporary image hosting API. Send bytes, get a short URL. Same limits as the site. Authenticated only — no anonymous /api/v1.",
  heroKicker: "Image hosting API",
  heroTitle: "Image in. URL out.",
  heroTagline: "Temporary image upload API",
  heroFacts: [
    "Bearer key — dropimg_api_…",
    "Upload, list, delete",
    "Expires: 1h · 24h · 7d · 30d · 90d · 180d",
  ],
  skip: "Skip to the request",
  detailsHeading: "API",
  curlLabel: "curl",
  curl: `curl -X POST https://dropimg.io/api/v1/images \\
  -H "Authorization: Bearer $DROPIMG_API_KEY" \\
  -F file=@shot.png \\
  -F expiry=7d`,
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
      q: "Is this a temporary image upload API?",
      a: "Yes. DropIMG is an image hosting API for short-lived links, not a permanent archive. Default expiry is 7 days when your plan allows it. Free: 1h, 24h, 7d, 30d. Pro also has 90d and 180d.",
    },
    {
      q: "Do I need an account?",
      a: "Yes for /api/v1. Create an API key on Integrations. Anonymous uploads stay on the website and ShareX — not on the public REST API.",
    },
    {
      q: "What scopes does a key have?",
      a: "images:write, images:read, and images:delete. New keys get all three. Uncheck any you do not want. ShareX and extension tokens stay upload-only.",
    },
    {
      q: "Where is the OpenAPI spec?",
      a: "https://dropimg.io/openapi/v1.yaml — same routes as this page.",
    },
    {
      q: "What is the API and MCP daily limit?",
      a: "API and MCP share one programmatic bucket: Free 20 uploads / 50 MB per day, Pro 100 / 500 MB. The site-wide 100 uploads / 500 MB ceiling still applies across every client. Default expiry on Free API/MCP is 24 hours.",
    },
  ],
  accountCta: "Create an API key",
  accountHref: "/app/integrations",
  specCta: "OpenAPI spec",
  specHref: OPENAPI_PATH,
  blocks: [
    {
      type: "h2",
      text: "Auth",
    },
    {
      type: "p",
      text: "Authorization: Bearer dropimg_api_…. Keys are shown once. Revoke them on Integrations. Do not put a key in a query string.",
    },
    {
      type: "h2",
      text: "Routes",
    },
    {
      type: "ul",
      items: [
        "POST /api/v1/images — multipart file + optional expiry=7d. Scope images:write.",
        "GET /api/v1/images/:id — one of your live images. Scope images:read.",
        "GET /api/v1/images — list envelope with next_cursor. Scope images:read.",
        "DELETE /api/v1/images/:id — owner delete. Scope images:delete. Create does not return a delete token.",
      ],
    },
    {
      type: "h2",
      text: "Limits",
    },
    {
      type: "p",
      text: "Same entitlements as the rest of DropIMG: 10 MB per file on Free, plan expiries, and the upload burst. API and MCP share 20 uploads / 50 MB per day on Free, 100 / 500 MB on Pro. Errors are { \"error\", \"code\" } with 401 or 403 when the key is missing or too narrow, and 429 quota_exceeded when the programmatic daily bucket is full.",
    },
  ],
};

export const DEVELOPERS_EXAMPLES = {
  js: `const form = new FormData();
form.append("file", file);
form.append("expiry", "7d");

const res = await fetch("https://dropimg.io/api/v1/images", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.DROPIMG_API_KEY}\` },
  body: form,
});
const image = await res.json();
console.log(image.url);`,
  python: `import os, requests

r = requests.post(
    "https://dropimg.io/api/v1/images",
    headers={"Authorization": f"Bearer {os.environ['DROPIMG_API_KEY']}"},
    files={"file": open("shot.png", "rb")},
    data={"expiry": "7d"},
)
print(r.json()["url"])`,
  node: `import { readFile } from "node:fs/promises";

const form = new FormData();
form.set("file", new Blob([await readFile("shot.png")]), "shot.png");
form.set("expiry", "7d");

const res = await fetch("https://dropimg.io/api/v1/images", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.DROPIMG_API_KEY}\` },
  body: form,
});
console.log((await res.json()).url);`,
  php: `<?php
$ch = curl_init("https://dropimg.io/api/v1/images");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ["Authorization: Bearer " . getenv("DROPIMG_API_KEY")],
  CURLOPT_POSTFIELDS => [
    "file" => new CURLFile("shot.png"),
    "expiry" => "7d",
  ],
  CURLOPT_RETURNTRANSFER => true,
]);
echo json_decode(curl_exec($ch), true)["url"];`,
};
