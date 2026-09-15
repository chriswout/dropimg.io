import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { runCleanup } from "./cron/cleanup";
import { IMAGE_SCOPES } from "./lib/integration-token";
import { resolveIntegrationTokenValue } from "./lib/integration-token";
import { mediaEnabled } from "./lib/media-config";
import { limitAnonymousMcp, limitAuthenticatedMcp } from "./lib/mcp-limit";
import {
  handleAuthenticatedMcp,
  wantsMcpMarketingPage,
  type McpAuthProps,
} from "./lib/mcp-server";
import { projectTokenFormatOk, resolveProjectCredential } from "./lib/project-credential";
import { accountRoutes } from "./routes/account";
import { adminRoutes } from "./routes/admin";
import { apiV1Routes } from "./routes/api-v1";
import { authRoutes } from "./routes/auth";
import { billingRoutes } from "./routes/billing";
import { browserPairingRoutes } from "./routes/browser-pairing";
import { deletePageRoutes } from "./routes/delete-page";
import { deleteRoutes } from "./routes/delete";
import { eventRoutes } from "./routes/event";
import { imageRoutes } from "./routes/image";
import { integrationRoutes } from "./routes/integrations";
import { sharexRoutes } from "./routes/integrations-sharex";
import { oauthRoutes } from "./routes/oauth";
import { reportRoutes } from "./routes/report";
import { mediaApiRoutes } from "./routes/media-api";
import { mediaDeliveryRoutes } from "./routes/media-delivery";
import { shareRoutes } from "./routes/share";
import { uploadRoutes } from "./routes/upload";

type Env = {
  Bindings: Cloudflare.Env;
};

const app = new Hono<Env>();

/**
 * One public origin: https://dropimg.io/…
 * HTTP and www both 301 here so Search Console does not treat them as
 * alternates. Local wrangler (127.0.0.1) is left alone.
 */
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const publicHost =
    url.hostname === "dropimg.io" || url.hostname === "www.dropimg.io";
  if (publicHost && url.protocol === "http:") {
    url.protocol = "https:";
    url.hostname = "dropimg.io";
    return c.redirect(url.toString(), 301);
  }
  if (url.hostname === "www.dropimg.io") {
    url.hostname = "dropimg.io";
    return c.redirect(url.toString(), 301);
  }
  await next();
});

app.get("/health", (c) => c.json({ ok: true, service: "dropimg" }));

app.route("/", apiV1Routes);
app.route("/", mediaApiRoutes);
app.route("/", mediaDeliveryRoutes);
app.route("/", uploadRoutes);
app.route("/", eventRoutes);
app.route("/", authRoutes);
app.route("/", billingRoutes);
app.route("/", accountRoutes);
app.route("/", imageRoutes);
app.route("/", deleteRoutes);
app.route("/", deletePageRoutes);
app.route("/", reportRoutes);
app.route("/", adminRoutes);
app.route("/", integrationRoutes);
app.route("/", browserPairingRoutes);
app.route("/", sharexRoutes);
app.route("/", shareRoutes);
app.route("/", oauthRoutes);

app.notFound(async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("Not found", 404);
});

const mcpApi = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const props = (ctx as ExecutionContext & { props?: McpAuthProps }).props;
    if (!props?.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    const limited = await limitAuthenticatedMcp(env, props.userId);
    if (limited) return limited;
    return handleAuthenticatedMcp(request, env, ctx, props);
  },
};

const oauth = new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: mcpApi,
  defaultHandler: { fetch: (request, env, ctx) => app.fetch(request, env, ctx) },
  authorizeEndpoint: "/oauth/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  scopesSupported: [...IMAGE_SCOPES],
  clientIdMetadataDocumentEnabled: true,
  resourceMetadata: {
    scopes_supported: [...IMAGE_SCOPES],
    bearer_methods_supported: ["header"],
    resource_name: "DropIMG",
  },
  async resolveExternalToken({ token, env }) {
    if (projectTokenFormatOk(token)) {
      if (!mediaEnabled(env)) return null;
      const credential = await resolveProjectCredential(env.DB, token);
      if (!credential) return null;
      return {
        props: {
          userId: credential.userId ?? `pk:${credential.credentialId}`,
          scopes: [],
          tokenId: credential.credentialId,
          media: {
            credentialId: credential.credentialId,
            orgId: credential.orgId,
            projectId: credential.projectId,
            scopes: credential.scopes,
            userId: credential.userId,
          },
        } satisfies McpAuthProps,
      };
    }
    const auth = await resolveIntegrationTokenValue(token, env.DB);
    if (!auth) return null;
    return {
      props: {
        userId: auth.userId,
        scopes: auth.scopes,
        tokenId: auth.tokenId,
      } satisfies McpAuthProps,
    };
  },
});

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    if (wantsMcpMarketingPage(request) && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    const limited = await limitAnonymousMcp(request, env);
    if (limited) return limited;
    return oauth.fetch(request, env, ctx);
  },
  async scheduled(
    _controller: ScheduledController,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(runCleanup(env));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
