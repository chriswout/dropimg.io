import type { FaqItem, LandingCopy } from "./types";

type McpCopy = LandingCopy & {
  heroKicker: string;
  heroTitle: string;
  heroTagline: string;
  heroFacts: [string, string, string];
  skip: string;
  detailsHeading: string;
  faqHeading: string;
  faqs: [FaqItem, FaqItem, FaqItem, FaqItem, FaqItem];
  accountCta: string;
  accountHref: string;
  docsCta: string;
  docsHref: string;
  claudeHeading: string;
  claudeSnippet: string;
};

export const MCP_PATH = "/mcp";
export const MCP_URL = "https://dropimg.io/mcp";

/** Remote Streamable HTTP config — OAuth happens after Cursor opens. */
export const CURSOR_INSTALL_URL =
  "https://cursor.com/en/install-mcp?name=dropimg&config=eyJ1cmwiOiJodHRwczovL2Ryb3BpbWcuaW8vbWNwIn0=";

export const MCP_PAGE: McpCopy = {
  title: "DropIMG MCP — Temporary image URLs from Cursor | dropimg.io",
  description:
    "Ask Cursor to upload a screenshot and get a temporary URL for GitHub issues, PRs, Slack, and tickets. Add to Cursor. OAuth. Links expire.",
  ogTitle: "DropIMG MCP | Screenshot to URL for agents",
  ogDescription:
    "Upload a workspace image from Cursor and get a temporary public URL. Add to Cursor, or any MCP client.",
  twitterTitle: "Ask your agent for a temporary image URL",
  twitterDescription:
    "DropIMG MCP for GitHub issues, PRs, and Slack. Add to Cursor. Links expire.",
  h1: "Ask your agent for a temporary image URL",
  lede: "Point Cursor at dropimg.io. The agent reads a PNG from your workspace, uploads it, and returns a real link — for a GitHub issue, a PR, Slack, or a ticket. Same write path as the site.",
  heroKicker: "Model Context Protocol",
  heroTitle: "Ask your agent for a temporary image URL",
  heroTagline: "Screenshot → URL, from Cursor",
  heroFacts: [
    "Add to Cursor — OAuth, no API key",
    "GitHub issues, PRs, Slack, tickets",
    "Links expire — 7d default, up to 180d",
  ],
  skip: "Skip to setup",
  detailsHeading: "Setup",
  faqHeading: "MCP questions",
  faqs: [
    {
      q: "How do I connect?",
      a: "Click Add to Cursor. Sign in and approve Connect DropIMG. Other clients can send Authorization: Bearer dropimg_api_… from Integrations, or use the same OAuth flow.",
    },
    {
      q: "What should I ask the agent?",
      a: "“Upload this screenshot and give me a link for the GitHub issue.” “Put screenshot.png on the PR.” “Upload this PNG for 24 hours.” The agent must read the file and call upload_image — it must not invent a URL.",
    },
    {
      q: "Which tools exist?",
      a: "upload_image (base64 or data URL, optional expiry), get_image, list_images, and delete_image. List is one text line per live drop, not the REST JSON envelope.",
    },
    {
      q: "Do uploads show in My drops?",
      a: "Yes. source=mcp, owned by your account, same history caps as the rest of DropIMG.",
    },
    {
      q: "Is MCP rate-limited?",
      a: "Yes. 30 MCP requests per minute per account. API and MCP also share a programmatic daily bucket: Free 20 uploads / 50 MB, Pro 100 / 500 MB. Uploads still hit the site-wide burst and 100/500 MB safety ceiling.",
    },
  ],
  accountCta: "Add to Cursor",
  accountHref: CURSOR_INSTALL_URL,
  docsCta: "Create an API key",
  docsHref: "/app/integrations",
  claudeHeading: "Claude Desktop snippet",
  claudeSnippet: `{
  "mcpServers": {
    "dropimg": {
      "url": "https://dropimg.io/mcp",
      "headers": {
        "Authorization": "Bearer dropimg_api_…"
      }
    }
  }
}`,
  blocks: [
    {
      type: "h2",
      text: "Cursor",
    },
    {
      type: "p",
      text: "Use Add to Cursor above. That opens Cursor with https://dropimg.io/mcp already filled in. Sign in and approve Connect DropIMG. The plugin adds a rule and a /share-image skill so the agent knows to read the file and upload — not invent a slug.",
    },
    {
      type: "h2",
      text: "Claude / other clients",
    },
    {
      type: "p",
      text: "Add a remote Streamable HTTP server at https://dropimg.io/mcp. OAuth works for clients that support MCP authorization. Otherwise create an API key on Integrations and send Authorization: Bearer dropimg_api_….",
    },
    {
      type: "h2",
      text: "Tools",
    },
    {
      type: "ul",
      items: [
        "upload_image — read a PNG/JPEG/WebP/GIF from the workspace, send base64, get a public URL. Optional expiry 1h–180d.",
        "get_image — when does abc123xy expire? Your live images only.",
        "list_images — one text line per live drop (id, URL, expiry). Not the REST JSON envelope.",
        "delete_image — take a screenshot down before it expires. Owner delete only.",
      ],
    },
    {
      type: "h2",
      text: "OAuth",
    },
    {
      type: "p",
      text: "Clients that speak MCP 2026-07-28 authorization can register and Connect DropIMG. Scopes match the API key: images:write, images:read, images:delete. The magic-link session is only the identity behind that flow.",
    },
  ],
};
