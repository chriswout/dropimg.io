import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import type { ImageScope, IntegrationAuth } from "./integration-token";
import {
  mcpDeleteImage,
  mcpGetImage,
  mcpListImages,
  mcpUploadImage,
  type McpToolContext,
} from "./mcp-tools";

export type McpAuthProps = {
  userId: string;
  scopes: ImageScope[];
  tokenId?: string;
};

export function mcpAuthFromProps(props: McpAuthProps): IntegrationAuth {
  return {
    userId: props.userId,
    tokenId: props.tokenId ?? "oauth",
    label: "MCP",
    kind: "api",
    scopes: props.scopes,
  };
}

/**
 * Tool text the agent sees. Lead with the job (GitHub / PR / Slack), then
 * how to call, then limits. Do not invent a URL — read bytes, then upload.
 */
export const MCP_TOOL_META = {
  upload_image: {
    description:
      "Upload a PNG, JPEG, WebP, or GIF and get a temporary public DropIMG URL for GitHub issues, PRs, Slack, Linear, or tickets. Read the image from the workspace first, then pass raw base64 or a data URL. Do not invent a URL. Do not pass a file path or http URL. SVG, PDF, and other types are rejected. Max 10 MB. The returned link is public until it expires.",
    image:
      "Raw base64 of the file bytes, or a data:image/png|jpeg|webp|gif;base64 URL. Read the workspace file first.",
    expiry:
      "Optional lifetime: 1h, 24h, 7d, 30d; Pro also 90d or 180d. Omit for the account default (7d on the site; Free API/MCP defaults to 24h).",
  },
  get_image: {
    description:
      "Look up one of YOUR live DropIMG uploads by its 8-character id. Use when the user asks when a link expires or wants the URL again. Returns not found for other people's images, expired ids, or deleted ids.",
    id: "8-character id from the URL (dropimg.io/abc123xy → abc123xy), not the full URL.",
  },
  list_images: {
    description:
      "List YOUR live DropIMG uploads as one line each: id, URL, expiry. Use when the user asks what they have hosted or which screenshot to delete. Not the REST JSON envelope. Pass cursor when a previous call returned next_cursor.",
    cursor: "Opaque next_cursor from a previous list_images call.",
  },
  delete_image: {
    description:
      "Permanently delete one of YOUR live DropIMG uploads by 8-character id. Use when the user wants a screenshot taken down before it expires. Confirm the id from list_images if they did not give one.",
    id: "8-character id from the URL (dropimg.io/abc123xy → abc123xy).",
  },
} as const;

export function createDropMcpServer(ctx: McpToolContext): McpServer {
  const server = new McpServer({
    name: "dropimg",
    version: "1.0.0",
  });

  server.registerTool(
    "upload_image",
    {
      description: MCP_TOOL_META.upload_image.description,
      inputSchema: {
        image: z.string().describe(MCP_TOOL_META.upload_image.image),
        expiry: z.string().optional().describe(MCP_TOOL_META.upload_image.expiry),
      },
    },
    async ({ image, expiry }) => ({
      content: [{ type: "text", text: await mcpUploadImage(ctx, { image, expiry }) }],
    }),
  );

  server.registerTool(
    "get_image",
    {
      description: MCP_TOOL_META.get_image.description,
      inputSchema: { id: z.string().describe(MCP_TOOL_META.get_image.id) },
    },
    async ({ id }) => ({
      content: [{ type: "text", text: await mcpGetImage(ctx, id) }],
    }),
  );

  server.registerTool(
    "list_images",
    {
      description: MCP_TOOL_META.list_images.description,
      inputSchema: {
        cursor: z.string().optional().describe(MCP_TOOL_META.list_images.cursor),
      },
    },
    async ({ cursor }) => ({
      content: [{ type: "text", text: await mcpListImages(ctx, cursor) }],
    }),
  );

  server.registerTool(
    "delete_image",
    {
      description: MCP_TOOL_META.delete_image.description,
      inputSchema: { id: z.string().describe(MCP_TOOL_META.delete_image.id) },
    },
    async ({ id }) => ({
      content: [{ type: "text", text: await mcpDeleteImage(ctx, id) }],
    }),
  );

  return server;
}

export function handleAuthenticatedMcp(
  request: Request,
  env: Cloudflare.Env,
  ctx: ExecutionContext,
  auth: IntegrationAuth,
): Promise<Response> {
  const origin = new URL(request.url).origin;
  const handler = createMcpHandler(() => createDropMcpServer({ env, ctx, auth, origin, request }), {
    route: "/mcp",
    allowedHostnames: [
      "dropimg.io",
      "www.dropimg.io",
      "localhost",
      "127.0.0.1",
      "dropimg-staging.christenwout.workers.dev",
    ],
    allowedOriginHostnames: "*",
  });
  return handler(request, env, ctx);
}

export function wantsMcpMarketingPage(request: Request): boolean {
  if (request.method !== "GET") return false;
  const path = new URL(request.url).pathname;
  if (path !== "/mcp" && path !== "/mcp/") return false;
  if (request.headers.get("authorization")) return false;
  if (request.headers.get("mcp-session-id")) return false;
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/event-stream")) return false;
  if (accept.includes("application/json") && !accept.includes("text/html")) return false;
  return true;
}
