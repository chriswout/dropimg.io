import { describe, expect, it } from "vitest";
import {
  buildSharexConfig,
  generateIntegrationToken,
  hashIntegrationToken,
  INTEGRATION_TOKEN_PREFIX,
  integrationTokenFormatOk,
  maskEmail,
  normalizeIntegrationKind,
  readBearerToken,
  validateIntegrationLabel,
} from "../../src/lib/integration-token";
import { parseSharexExpiry } from "../../src/lib/owned-upload";
import {
  chooseExpirySeconds,
  EXPIRY_24H,
  EXPIRY_7D,
  integrationTokenLooksValid,
} from "../../extension/src/shared";

describe("integration tokens", () => {
  it("generates a prefixed random token and hashes it", async () => {
    const token = generateIntegrationToken();
    expect(token.startsWith(INTEGRATION_TOKEN_PREFIX)).toBe(true);
    expect(integrationTokenFormatOk(token)).toBe(true);
    const hash = await hashIntegrationToken(token);
    expect(hash.byteLength).toBe(32);
    const other = await hashIntegrationToken(generateIntegrationToken());
    expect(Buffer.from(hash).toString("hex")).not.toBe(Buffer.from(other).toString("hex"));
  });

  it("reads Bearer tokens and rejects other locations", () => {
    const token = `${INTEGRATION_TOKEN_PREFIX}abcdefghijklmnopqr_stu`;
    const req = new Request("https://dropimg.io/api/integrations/me?token=nope", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(readBearerToken(req)).toBe(token);
    expect(readBearerToken(new Request("https://dropimg.io/x"))).toBeNull();
    expect(
      readBearerToken(
        new Request("https://dropimg.io/x", { headers: { Cookie: `dropimg_session=${token}` } }),
      ),
    ).toBeNull();
  });

  it("validates plain-text labels", () => {
    expect(validateIntegrationLabel("Chrome extension")).toBe("Chrome extension");
    expect(validateIntegrationLabel("  ShareX  ")).toBe("ShareX");
    expect(validateIntegrationLabel("")).toBeNull();
    expect(validateIntegrationLabel("x".repeat(51))).toBeNull();
    expect(validateIntegrationLabel("bad<label>")).toBeNull();
    expect(validateIntegrationLabel("line\nbreak")).toBeNull();
  });

  it("masks emails and builds a one-time ShareX config", () => {
    expect(maskEmail("christen@example.com")).toBe("c***@example.com");
    expect(normalizeIntegrationKind("extension")).toBe("extension");
    const cfg = buildSharexConfig("https://dropimg.io", "dropimg_it_secret");
    expect(cfg.RequestURL).toBe("https://dropimg.io/api/integrations/sharex");
    expect((cfg.Headers as { Authorization: string }).Authorization).toBe(
      "Bearer dropimg_it_secret",
    );
  });

  it("parses ShareX expiry fields", () => {
    expect(parseSharexExpiry("24h")).toBe(86400);
    expect(parseSharexExpiry("7d")).toBe(604800);
    expect(parseSharexExpiry("30d")).toBe(2592000);
    expect(parseSharexExpiry("nope")).toBeNull();
  });
});

describe("extension expiry helper", () => {
  it("uses last expiry only when the plan still allows it", () => {
    expect(chooseExpirySeconds([EXPIRY_24H], EXPIRY_7D)).toBe(EXPIRY_24H);
    expect(chooseExpirySeconds([EXPIRY_24H, EXPIRY_7D], EXPIRY_7D)).toBe(EXPIRY_7D);
    expect(integrationTokenLooksValid("dropimg_it_abcdefghijklmnopqr_stu")).toBe(true);
    expect(integrationTokenLooksValid("not-a-token")).toBe(false);
  });
});
