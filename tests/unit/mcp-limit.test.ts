import { describe, expect, it } from "vitest";
import {
  consumeMcpLimit,
  hasBearerToken,
  isMcpApiRequest,
  limitAnonymousMcp,
  limitAuthenticatedMcp,
  mcpRateLimitedResponse,
} from "../../src/lib/mcp-limit";

function limiter(successes: boolean[]): Cloudflare.Env["MCP_LIMIT"] {
  return {
    async limit() {
      const success = successes.shift() ?? false;
      return { success };
    },
  };
}

describe("MCP request helpers", () => {
  it("matches only the MCP API path", () => {
    expect(isMcpApiRequest(new Request("https://dropimg.io/mcp"))).toBe(true);
    expect(isMcpApiRequest(new Request("https://dropimg.io/mcp/"))).toBe(true);
    expect(isMcpApiRequest(new Request("https://dropimg.io/developers"))).toBe(false);
  });

  it("requires a Bearer token value", () => {
    expect(hasBearerToken(new Request("https://dropimg.io/mcp"))).toBe(false);
    expect(
      hasBearerToken(
        new Request("https://dropimg.io/mcp", { headers: { Authorization: "Bearer" } }),
      ),
    ).toBe(false);
    expect(
      hasBearerToken(
        new Request("https://dropimg.io/mcp", {
          headers: { Authorization: "Bearer dropimg_api_x" },
        }),
      ),
    ).toBe(true);
  });

  it("returns a 429 with Retry-After", () => {
    const res = mcpRateLimitedResponse();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});

describe("MCP limit", () => {
  it("is a no-op when the binding is missing", async () => {
    expect(await consumeMcpLimit({} as Cloudflare.Env, "mcp:user:1")).toBe(true);
  });

  it("skips anonymous limiting once a Bearer token is present", async () => {
    const env = {
      MCP_LIMIT: limiter([false]),
      ANALYTICS: { writeDataPoint() {} },
    } as unknown as Cloudflare.Env;
    const res = await limitAnonymousMcp(
      new Request("https://dropimg.io/mcp", {
        method: "POST",
        headers: { Authorization: "Bearer dropimg_api_x" },
      }),
      env,
    );
    expect(res).toBeNull();
  });

  it("rejects an anonymous burst", async () => {
    const env = {
      MCP_LIMIT: limiter([false]),
      ANALYTICS: { writeDataPoint() {} },
      ENVIRONMENT: "development",
      IP_HASH_SECRET: "test-ip-hash-secret",
    } as unknown as Cloudflare.Env;
    const res = await limitAnonymousMcp(
      new Request("https://dropimg.io/mcp", { method: "POST" }),
      env,
    );
    expect(res?.status).toBe(429);
  });

  it("rejects an authenticated burst by user id", async () => {
    const env = {
      MCP_LIMIT: limiter([false]),
      ANALYTICS: { writeDataPoint() {} },
    } as unknown as Cloudflare.Env;
    const res = await limitAuthenticatedMcp(env, "user-1");
    expect(res?.status).toBe(429);
  });
});
