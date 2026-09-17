import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import {
  IMAGE_SCOPES,
  isImageScope,
  type ImageScope,
  type IntegrationAuth,
} from "./integration-token";
import { mediaEnabled } from "./media-config";
import type { MediaScope } from "./media-config";
import {
  mcpCreateMediaProject,
  mcpGetMediaAsset,
  mcpListMediaAssets,
  mcpListMediaProjects,
  mcpReplaceMediaAsset,
  mcpUploadMediaAsset,
} from "./mcp-media-tools";
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
  media?: {
    credentialId: string;
    orgId: string;
    projectId: string;
    scopes: MediaScope[];
    userId: string | null;
  };
};

/**
 * Cursor (and other MCP OAuth clients) often request no `images:*` scopes.
 * Empty OAuth grants still belong to a signed-in account, so Drop tools must
 * work. Project keys keep empty image scopes and must not gain Drop access.
 */
export function oauthImageScopes(props: McpAuthProps): ImageScope[] {
  const recognized = (props.scopes ?? []).filter(isImageScope);
  if (props.media) return recognized;
  const oauthSession = !props.tokenId || props.tokenId === "oauth";
  if (oauthSession && recognized.length === 0) return [...IMAGE_SCOPES];
  return recognized;
}

export function mcpAuthFromProps(props: McpAuthProps): IntegrationAuth {
  return {
    userId: props.userId,
    tokenId: props.tokenId ?? "oauth",
    label: "MCP",
    kind: "api",
    scopes: oauthImageScopes(props),
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
  list_media_projects: {
    description:
      "List DropIMG Media projects. Media is permanent Web Assets for application code (logos, heroes, favicons, illustrations, web fonts) at stable /m/{org}/{project}/... aliases. Temporary screenshots and tickets use Drop tools instead. Pass project_id explicitly later — there is no implicit current project.",
  },
  create_media_project: {
    description:
      "Create a DropIMG Media project in the signed-in user's personal organization. Use a slug like website or storefront. Project keys cannot create projects.",
    slug: "URL slug: lowercase letters, digits, hyphen. Example: website",
    name: "Optional display name. Defaults to the slug.",
  },
  list_media_assets: {
    description:
      "List live Web Assets in one Media project. Returns asset_id, path, stable url, version, asset_type, mime, size. Never invent a /m/... URL.",
    project_id: "Project UUID from list_media_projects or create_media_project.",
  },
  get_media_asset: {
    description:
      "Get one live Web Asset by project_id and asset_id. Returns asset_type and mime from stored bytes, not the filename.",
    project_id: "Project UUID.",
    asset_id: "Asset UUID.",
  },
  upload_media_asset: {
    description:
      "Start a permanent Web Asset upload (JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2). Returns a short-lived upload URL. POST the file bytes over HTTP — do not send bytes or base64 in this tool. Do not invent a /m/... URL; use the JSON url after the HTTP upload. Temporary screenshots belong in upload_image (Drops), not here. PDFs, video, audio, archives, and code files are rejected.",
    project_id: "Project UUID.",
    path: "Stable alias path inside the project, e.g. branding/logo or fonts/inter. No file extension required.",
    name: "Optional display name.",
  },
  replace_media_asset: {
    description:
      "Start a replacement of an existing Web Asset. Requires confirm=true. The public /m/... URL does not change; MIME may change (SVG logo can become PNG). POST the new bytes to the returned upload URL.",
    project_id: "Project UUID.",
    asset_id: "Asset UUID to replace.",
    confirm: "Must be true to create a replacement upload intent.",
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

  if (mediaEnabled(ctx.env)) {
    const mediaCtx = {
      ...ctx,
      mediaAuth: ctx.mediaAuth ?? null,
    };

    server.registerTool(
      "list_media_projects",
      { description: MCP_TOOL_META.list_media_projects.description, inputSchema: {} },
      async () => ({
        content: [{ type: "text", text: await mcpListMediaProjects(mediaCtx) }],
      }),
    );

    server.registerTool(
      "create_media_project",
      {
        description: MCP_TOOL_META.create_media_project.description,
        inputSchema: {
          slug: z.string().describe(MCP_TOOL_META.create_media_project.slug),
          name: z.string().optional().describe(MCP_TOOL_META.create_media_project.name),
        },
      },
      async ({ slug, name }) => ({
        content: [{ type: "text", text: await mcpCreateMediaProject(mediaCtx, { slug, name }) }],
      }),
    );

    server.registerTool(
      "list_media_assets",
      {
        description: MCP_TOOL_META.list_media_assets.description,
        inputSchema: {
          project_id: z.string().describe(MCP_TOOL_META.list_media_assets.project_id),
        },
      },
      async ({ project_id }) => ({
        content: [{ type: "text", text: await mcpListMediaAssets(mediaCtx, { project_id }) }],
      }),
    );

    server.registerTool(
      "get_media_asset",
      {
        description: MCP_TOOL_META.get_media_asset.description,
        inputSchema: {
          project_id: z.string().describe(MCP_TOOL_META.get_media_asset.project_id),
          asset_id: z.string().describe(MCP_TOOL_META.get_media_asset.asset_id),
        },
      },
      async ({ project_id, asset_id }) => ({
        content: [{ type: "text", text: await mcpGetMediaAsset(mediaCtx, { project_id, asset_id }) }],
      }),
    );

    server.registerTool(
      "upload_media_asset",
      {
        description: MCP_TOOL_META.upload_media_asset.description,
        inputSchema: {
          project_id: z.string().describe(MCP_TOOL_META.upload_media_asset.project_id),
          path: z.string().describe(MCP_TOOL_META.upload_media_asset.path),
          name: z.string().optional().describe(MCP_TOOL_META.upload_media_asset.name),
        },
      },
      async ({ project_id, path, name }) => ({
        content: [
          { type: "text", text: await mcpUploadMediaAsset(mediaCtx, { project_id, path, name }) },
        ],
      }),
    );

    server.registerTool(
      "replace_media_asset",
      {
        description: MCP_TOOL_META.replace_media_asset.description,
        inputSchema: {
          project_id: z.string().describe(MCP_TOOL_META.replace_media_asset.project_id),
          asset_id: z.string().describe(MCP_TOOL_META.replace_media_asset.asset_id),
          confirm: z.boolean().optional().describe(MCP_TOOL_META.replace_media_asset.confirm),
        },
      },
      async ({ project_id, asset_id, confirm }) => ({
        content: [
          {
            type: "text",
            text: await mcpReplaceMediaAsset(mediaCtx, { project_id, asset_id, confirm }),
          },
        ],
      }),
    );
  }

  return server;
}

export function handleAuthenticatedMcp(
  request: Request,
  env: Cloudflare.Env,
  ctx: ExecutionContext,
  props: McpAuthProps,
): Promise<Response> {
  const origin = new URL(request.url).origin;
  const auth = mcpAuthFromProps(props);
  const mediaAuth = props.media
    ? {
        credentialId: props.media.credentialId,
        orgId: props.media.orgId,
        projectId: props.media.projectId,
        userId: props.media.userId,
        scopes: props.media.scopes,
      }
    : null;
  const handler = createMcpHandler(
    () => createDropMcpServer({ env, ctx, auth, origin, request, mediaAuth }),
    {
      route: "/mcp",
      allowedHostnames: [
        "dropimg.io",
        "www.dropimg.io",
        "localhost",
        "127.0.0.1",
        "dropimg-staging.christenwout.workers.dev",
      ],
      allowedOriginHostnames: "*",
    },
  );
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
