import { Hono } from "hono";
import {
  AuthorizationError,
  type AuthRequest,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveSession } from "../lib/auth/session";
import { IMAGE_SCOPES, isImageScope, type ImageScope } from "../lib/integration-token";
import { oauthAuthorizeHtmlResponse } from "../views/oauth-authorize";

type Env = {
  Bindings: Cloudflare.Env & { OAUTH_PROVIDER: OAuthHelpers };
};

export const oauthRoutes = new Hono<Env>();

oauthRoutes.get("/oauth/authorize", async (c) => {
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) {
    const next = `/oauth/authorize?${new URL(c.req.url).searchParams.toString()}`;
    return c.redirect(`/login?next=${encodeURIComponent(next)}`, 302);
  }

  let oauthRequest: AuthRequest;
  try {
    oauthRequest = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  } catch (error) {
    return authorizeError(error);
  }

  const client = await c.env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
  if (!client) return c.text("Unknown OAuth client", 400);

  const requested = requestedScopes(oauthRequest.scope);
  return oauthAuthorizeHtmlResponse({
    env: c.env,
    email: session.email,
    clientName: client.clientName || "MCP client",
    requested,
    returnTo: `${new URL(c.req.url).pathname}${new URL(c.req.url).search}`,
  });
});

oauthRoutes.post("/oauth/authorize", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.text("Invalid origin", 403);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.redirect("/login", 302);

  const form = await c.req.parseBody();
  const returnTo = String(form.return_to ?? "");
  if (!returnTo.startsWith("/oauth/authorize?")) return c.text("Invalid request", 400);

  let oauthRequest: AuthRequest;
  try {
    oauthRequest = await c.env.OAUTH_PROVIDER.parseAuthRequest(
      new Request(new URL(returnTo, c.req.url), { method: "GET" }),
    );
  } catch (error) {
    return authorizeError(error);
  }

  const decision = String(form.decision ?? "");
  if (decision !== "allow") {
    const redirect = new URL(oauthRequest.redirectUri);
    redirect.searchParams.set("error", "access_denied");
    if (oauthRequest.state) redirect.searchParams.set("state", oauthRequest.state);
    if (oauthRequest.issuer) redirect.searchParams.set("iss", oauthRequest.issuer);
    return c.redirect(redirect.toString(), 302);
  }

  const granted = selectedScopes(form).filter((scope) => oauthRequest.scope.includes(scope));
  const scopes = granted.length ? granted : requestedScopes(oauthRequest.scope);

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthRequest,
    userId: session.id,
    metadata: { clientName: "DropIMG" },
    scope: scopes,
    props: { userId: session.id, scopes },
  });
  return c.redirect(redirectTo, 302);
});

function requestedScopes(raw: string[]): ImageScope[] {
  const asked = raw.filter(isImageScope);
  return asked.length ? asked : [...IMAGE_SCOPES];
}

function selectedScopes(form: Record<string, unknown>): ImageScope[] {
  const raw = form.scope;
  const values = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return values.map(String).filter(isImageScope);
}

function authorizeError(error: unknown): Response {
  if (!(error instanceof AuthorizationError)) throw error;
  if (!error.redirectUri) {
    return new Response(error.description, { status: 400 });
  }
  const redirect = new URL(error.redirectUri);
  redirect.searchParams.set("error", error.code);
  redirect.searchParams.set("error_description", error.description);
  if (error.state) redirect.searchParams.set("state", error.state);
  if (error.issuer) redirect.searchParams.set("iss", error.issuer);
  return Response.redirect(redirect.toString(), 302);
}
