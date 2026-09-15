import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { localViteWebServerEnv } from "../support/local-vite-env";

const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
const viteConfig = readFileSync("vite.config.ts", "utf8");

describe("local e2e must not require live Cloudflare", () => {
  it("keeps Cloudflare credentials off the default CI job env", () => {
    expect(workflow).toContain("Unit and integration tests");
    expect(workflow).toContain("Playwright e2e");
    expect(workflow).toContain("Verify Cloudflare credentials");
    expect(workflow).toContain("Apply remote D1 migrations (staging)");
    expect(workflow).toContain("Build");
    expect(workflow).toContain("Deploy Worker");
    const jobEnv = workflow.split("steps:")[0];
    expect(jobEnv).not.toContain("CLOUDFLARE_API_TOKEN");
    expect(jobEnv).not.toContain("CLOUDFLARE_ACCOUNT_ID");
  });

  it("disables Vite remote bindings unless explicitly opted in", () => {
    expect(viteConfig).toContain("remoteBindings: viteRemoteBindingsEnabled()");
    expect(viteConfig).toContain('process.env.CLOUDFLARE_VITE_REMOTE_BINDINGS === "true"');
  });

  it("strips live Cloudflare credentials from the Playwright webServer env helper", () => {
    const env = localViteWebServerEnv();
    expect(env.CLOUDFLARE_API_TOKEN).toBeUndefined();
    expect(env.CLOUDFLARE_ACCOUNT_ID).toBeUndefined();
    expect(env.CLOUDFLARE_ENV).toBeUndefined();
    expect(env.CLOUDFLARE_VITE_REMOTE_BINDINGS).toBe("false");
  });

  it("forces Vite onto local bindings even when the parent shell opted into remote", () => {
    expect(readFileSync("playwright.config.ts", "utf8")).toContain(
      "CLOUDFLARE_VITE_REMOTE_BINDINGS=false",
    );
    expect(readFileSync("playwright.config.ts", "utf8")).toContain(
      "-u CLOUDFLARE_ENV",
    );
  });
});
