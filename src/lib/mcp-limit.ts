import { track } from "./analytics";
import { clientIp, hashIp } from "./ip";
import { resolveIpHashSecret } from "./secrets";

/** MCP protocol calls per account (or anonymous IP) per Cloudflare location. */
export const MCP_LIMIT_PER_MINUTE = 30;

export function isMcpApiRequest(request: Request): boolean {
  const path = new URL(request.url).pathname;
  return path === "/mcp" || path === "/mcp/";
}

export function hasBearerToken(request: Request): boolean {
  return /^Bearer\s+\S+/i.test(request.headers.get("authorization") || "");
}

export function mcpRateLimitedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Too many MCP requests. Try again shortly.",
      code: "rate_limited",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "60",
      },
    },
  );
}

export async function consumeMcpLimit(
  env: Pick<Cloudflare.Env, "MCP_LIMIT">,
  key: string,
): Promise<boolean> {
  const limiter = env.MCP_LIMIT;
  if (!limiter) return true;
  const { success } = await limiter.limit({ key });
  return success;
}

function rejectMcpBurst(): Response {
  return mcpRateLimitedResponse();
}

export async function limitAnonymousMcp(
  request: Request,
  env: Cloudflare.Env,
): Promise<Response | null> {
  if (!isMcpApiRequest(request) || hasBearerToken(request)) return null;
  const secretResolved = resolveIpHashSecret(env);
  const ipHash = secretResolved.ok
    ? await hashIp(clientIp(request), secretResolved.secret)
    : "unknown";
  if (await consumeMcpLimit(env, `mcp:anon:${ipHash}`)) return null;
  track(env.ANALYTICS, "rate_limited", {
    reason: "mcp_burst",
    client: "mcp",
    pageIntent: "mcp",
  });
  return rejectMcpBurst();
}

export async function limitAuthenticatedMcp(
  env: Cloudflare.Env,
  userId: string,
): Promise<Response | null> {
  if (await consumeMcpLimit(env, `mcp:user:${userId}`)) return null;
  track(env.ANALYTICS, "rate_limited", {
    reason: "mcp_burst",
    client: "mcp",
    pageIntent: "mcp",
  });
  return rejectMcpBurst();
}
